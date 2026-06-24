import os
from collections import defaultdict
from time import time

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import auth
import models
import schemas
from database import engine, get_db
from gemini import describe_image
from prompts import build_prompt

models.Base.metadata.create_all(bind=engine)

# Add columns that may be missing from existing databases (lightweight migration)
from sqlalchemy import inspect, text as _sa_text
with engine.connect() as _conn:
    _cols = [c["name"] for c in inspect(engine).get_columns("scans")]
    if "thumbnail" not in _cols:
        _conn.execute(_sa_text("ALTER TABLE scans ADD COLUMN thumbnail TEXT"))
        _conn.commit()

app = FastAPI(title="Iris API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory per-user rate limiter for /describe
_describe_calls: dict[int, list[float]] = defaultdict(list)
_RATE_LIMIT = int(os.getenv("DESCRIBE_RATE_LIMIT", "15"))  # requests per minute


def _check_rate_limit(user_id: int) -> None:
    now = time()
    calls = _describe_calls[user_id]
    calls[:] = [t for t in calls if now - t < 60.0]
    if len(calls) >= _RATE_LIMIT:
        raise HTTPException(429, "Too many requests. Please wait before scanning again.")
    calls.append(now)


@app.get("/")
def root():
    return {"service": "Iris API", "version": "2.0", "ok": True}


@app.post("/auth/register", response_model=schemas.TokenOut)
def register(body: schemas.RegisterIn, db: Session = Depends(get_db)):
    if not body.email or not body.password:
        raise HTTPException(400, "Email and password are required.")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(400, "That email is already registered.")
    user = models.User(
        email=body.email, hashed_password=auth.hash_password(body.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.TokenOut(access_token=auth.create_token(user.id))


@app.post("/auth/login", response_model=schemas.TokenOut)
def login(body: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not auth.verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Wrong email or password.")
    return schemas.TokenOut(access_token=auth.create_token(user.id))


@app.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(auth.get_current_user)):
    return schemas.UserOut(email=user.email, language=user.language)


@app.patch("/me", response_model=schemas.UserOut)
def update_me(
    body: schemas.LangIn,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    user.language = body.language
    db.commit()
    db.refresh(user)
    return schemas.UserOut(email=user.email, language=user.language)


@app.patch("/me/password", status_code=204)
def change_password(
    body: schemas.ChangePasswordIn,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(body.current_password, user.hashed_password):
        raise HTTPException(400, "Current password is incorrect.")
    if len(body.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters.")
    user.hashed_password = auth.hash_password(body.new_password)
    db.commit()


@app.post("/describe", response_model=schemas.DescribeOut)
async def describe(
    body: schemas.DescribeIn,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _check_rate_limit(user.id)
    if not body.image_base64:
        raise HTTPException(400, "No image provided.")
    if body.mode not in ("scene", "text", "object"):
        raise HTTPException(400, "Mode must be scene, text, or object.")
    prompt = build_prompt(body.mode, body.lang)
    try:
        text = await describe_image(body.image_base64, prompt, body.mode)
    except Exception as exc:
        raise HTTPException(502, str(exc))
    db.add(
        models.Scan(
            user_id=user.id, mode=body.mode, language=body.lang, result=text,
            thumbnail=body.thumbnail_base64,
        )
    )
    db.commit()
    return schemas.DescribeOut(text=text)


@app.get("/history", response_model=list[schemas.ScanOut])
def history(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Scan)
        .filter(models.Scan.user_id == user.id)
        .order_by(models.Scan.created_at.desc())
        .limit(50)
        .all()
    )


@app.delete("/history/{scan_id}", status_code=204)
def delete_scan(
    scan_id: int,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    scan = (
        db.query(models.Scan)
        .filter(models.Scan.id == scan_id, models.Scan.user_id == user.id)
        .first()
    )
    if not scan:
        raise HTTPException(404, "Scan not found.")
    db.delete(scan)
    db.commit()


@app.get("/stats", response_model=schemas.StatsOut)
def stats(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    scans = db.query(models.Scan).filter(models.Scan.user_id == user.id).all()
    return schemas.StatsOut(
        total_scans=len(scans),
        scene_scans=sum(1 for s in scans if s.mode == "scene"),
        text_scans=sum(1 for s in scans if s.mode == "text"),
        object_scans=sum(1 for s in scans if s.mode == "object"),
    )
