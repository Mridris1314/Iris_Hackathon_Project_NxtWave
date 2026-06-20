LANGUAGES = {
    "en": "English",
    "te": "Telugu",
    "hi": "Hindi",
    "ta": "Tamil",
    "kn": "Kannada",
    "bn": "Bengali",
    "mr": "Marathi",
    "ur": "Urdu",
}


def build_prompt(mode: str, lang: str) -> str:
    name = LANGUAGES.get(lang, "English")
    base = (
        f"IMPORTANT: Respond ONLY in {name}. "
        "Be specific, accurate, and concise. Speak in plain words a blind person can immediately act on. "
        "Do not use markdown, bullet points, headings, or lists. Speak in natural flowing sentences."
    )

    if mode == "text":
        return (
            f"{base}\n\n"
            "You are assisting a visually impaired user who needs text read aloud. "
            "Carefully read ALL visible text in this image in natural reading order (top to bottom, left to right). "
            "If it is a label, sign, receipt, document, or package — first state what type it is, then read the text. "
            "Include numbers, prices, dates, expiry dates, and important small print. "
            "If the text is partially visible or blurry, say what you can read and note that part is unclear. "
            "If there is no readable text, say: there is no readable text in this image."
        )

    if mode == "object":
        return (
            f"{base}\n\n"
            "You are assisting a visually impaired user who wants to identify what they are holding. "
            "Look carefully and identify the main object. "
            "If it is Indian currency (rupee notes or coins): state 'This is a' then the denomination clearly, for example 'This is a 500 rupee note' or 'This is a 10 rupee coin'. "
            "If it is a product: say its brand name, product name, and key information such as quantity, flavour, or variant. "
            "If it is food: describe what it is and whether it looks fresh or cooked. "
            "If it is a document: say what type of document it is. "
            "If you are not sure: say what it most likely is and that you are not certain. "
            "Always be specific — never just say 'an object'."
        )

    # default: scene
    return (
        f"{base}\n\n"
        "You are assisting a visually impaired user who needs to understand their surroundings. "
        "Describe the scene in 2 to 3 short sentences. Cover: "
        "1) The main environment (indoors or outdoors, type of place). "
        "2) Key people or objects and their position (left, right, ahead, nearby, far). "
        "3) Anything important for safety or navigation such as steps, doors, traffic, or obstacles. "
        "If there are people, describe how many and what they are doing. "
        "Be specific about distances and directions when visible."
    )
