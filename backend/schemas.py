from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RegisterIn(BaseModel):
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    email: str
    language: str


class LangIn(BaseModel):
    language: str


class DescribeIn(BaseModel):
    image_base64: str
    mode: str = "scene"
    lang: str = "en"
    thumbnail_base64: Optional[str] = None


class DescribeOut(BaseModel):
    text: str


class ScanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    mode: str
    language: str
    result: str
    thumbnail: Optional[str] = None
    created_at: datetime


class StatsOut(BaseModel):
    total_scans: int
    scene_scans: int
    text_scans: int
    object_scans: int


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str
