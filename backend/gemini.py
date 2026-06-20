import os
import httpx


async def describe_image(image_base64: str, prompt: str) -> str:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("Server is missing GEMINI_API_KEY.")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if "," in image_base64:
        header, data = image_base64.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0] if ":" in header else "image/jpeg"
    else:
        data, mime_type = image_base64, "image/jpeg"

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": data}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 512,
            "topP": 0.8,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ],
    }

    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(url, json=body, headers={"x-goog-api-key": key})

    if resp.status_code == 429:
        raise RuntimeError(
            "API quota exceeded. You've hit the Gemini free-tier limit. "
            "Wait a minute and try again, or upgrade your Google AI plan."
        )
    if resp.status_code != 200:
        raise RuntimeError(
            f"The vision model could not be reached ({resp.status_code}). "
            f"{resp.text[:300]}"
        )

    payload = resp.json()
    candidates = payload.get("candidates", [])
    if not candidates:
        raise RuntimeError("No response from the vision model. Please try again.")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = " ".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RuntimeError("The model returned an empty response. Please try again.")
    return text
