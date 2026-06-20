export type Lang = { code: string; label: string; native: string; speech: string };

export const LANGUAGES: Lang[] = [
  { code: "en", label: "English", native: "English", speech: "en-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", speech: "te-IN" },
  { code: "hi", label: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { code: "ta", label: "Tamil", native: "தமிழ்", speech: "ta-IN" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", speech: "kn-IN" },
  { code: "bn", label: "Bengali", native: "বাংলা", speech: "bn-IN" },
  { code: "mr", label: "Marathi", native: "मराठी", speech: "mr-IN" },
  { code: "ur", label: "Urdu", native: "اردو", speech: "ur-IN" },
];

export function langByCode(code: string): Lang {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
