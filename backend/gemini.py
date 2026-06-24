import asyncio
import os
import httpx

# Per-mode generation configs: text reading needs high token limit and low temp
# for accuracy; object ID needs low temp for decisive answers; scene can be
# slightly warmer to produce natural language.
_MODE_CONFIGS = {
    "text":   {"temperature": 0.1, "maxOutputTokens": 2048, "topP": 0.95},
    "object": {"temperature": 0.1, "maxOutputTokens": 768,  "topP": 0.9},
    "scene":  {"temperature": 0.2, "maxOutputTokens": 1024, "topP": 0.85},
}


async def describe_image(image_base64: str, prompt: str, mode: str = "scene") -> str:
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
        "generationConfig": _MODE_CONFIGS.get(mode, _MODE_CONFIGS["scene"]),
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ],
    }

    _retryable = {429, 503}
    _delays = [1, 2, 4]
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt, delay in enumerate(_delays):
            resp = await client.post(url, json=body, headers={"x-goog-api-key": key})
            if resp.status_code not in _retryable or attempt == len(_delays) - 1:
                break
            await asyncio.sleep(delay)

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
        # promptFeedback block (e.g. image flagged before generation)
        block = payload.get("promptFeedback", {}).get("blockReason", "")
        if block:
            raise RuntimeError(
                "This image was blocked by the safety filter. Try a different photo."
            )
        raise RuntimeError("No response from the vision model. Please try again.")

    candidate = candidates[0]
    finish_reason = candidate.get("finishReason", "")
    if finish_reason == "SAFETY":
        raise RuntimeError(
            "The model's response was blocked by a safety filter. Try a different image."
        )

    parts = candidate.get("content", {}).get("parts", [])
    text = "\n".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RuntimeError("The model returned an empty response. Please try again.")
    return text
