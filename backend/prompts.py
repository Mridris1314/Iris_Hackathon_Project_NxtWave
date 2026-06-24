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
        f"You MUST respond ONLY in {name}. "
        "Do not use markdown, bullet points, asterisks, hyphens, or numbered lists. "
        "Write in plain, natural spoken sentences only."
    )

    if mode == "text":
        return (
            f"{base}\n\n"
            "Task: Read every piece of text visible in this image aloud for a blind person.\n\n"
            "Rules:\n"
            "- First say what kind of item it is (for example: 'This is a medicine bottle label' or 'This is a receipt').\n"
            "- Then read all the text exactly as it appears, in top-to-bottom, left-to-right order.\n"
            "- Include ALL numbers, prices, dates, expiry dates, quantities, ingredients, warnings, and fine print — nothing is too small to mention.\n"
            "- If any text is blurry or cut off, read what you can and say 'the rest is unclear'.\n"
            "- If there is no text at all, say: there is no readable text in this image."
        )

    if mode == "object":
        return (
            f"{base}\n\n"
            "Task: Identify the main object in this image for a blind person who is holding it.\n\n"
            "Rules:\n"
            "- Start with 'This is a' and name the object clearly and specifically.\n"
            "- For Indian currency notes: state the denomination first, for example 'This is a 500 rupee note'. Look carefully at the printed number on the note — do not guess.\n"
            "- For Indian coins: state 'This is a X rupee coin' or 'This is a X paise coin'. Look at the number engraved on the coin.\n"
            "- For packaged products: say the brand name, product name, variant, and quantity (for example: 'This is a Maggi 2-Minute Noodles Masala flavour, 70 gram packet').\n"
            "- For food: describe what it is and whether it appears fresh, cooked, or packaged.\n"
            "- For documents or ID cards: state the document type (for example: 'This is an Aadhaar card' or 'This is a prescription').\n"
            "- If you cannot identify it confidently, say what it most likely is and that you are not certain.\n"
            "- Never say just 'an object' — always be as specific as possible."
        )

    # default: scene
    return (
        f"{base}\n\n"
        "Task: Describe this scene clearly so a blind person understands where they are and what is around them.\n\n"
        "Rules:\n"
        "- First sentence: say where the person appears to be (for example: indoors in a kitchen, outdoors on a street, in a shop).\n"
        "- Second sentence: describe the most important things around them — people, objects, furniture, vehicles — and their position (left, right, ahead, close, far).\n"
        "- Third sentence: mention anything relevant to safety or navigation such as steps, an open door, traffic, a crowd, or an obstacle.\n"
        "- If there are no safety concerns, use the third sentence to give one more useful detail.\n"
        "- Keep the total response to three sentences. Be specific and use directions and distances when visible."
    )
