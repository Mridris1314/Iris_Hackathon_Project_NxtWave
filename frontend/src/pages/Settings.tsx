import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Globe, Info, CheckCircle, Lock, Eye, EyeOff, AudioLines } from "lucide-react";
import { api } from "../api";
import { LANGUAGES } from "../lib/languages";

const TTS_RATES = [
  { value: 0.6, label: "Slow" },
  { value: 0.85, label: "Slightly slow" },
  { value: 1.0, label: "Normal" },
  { value: 1.25, label: "Fast" },
  { value: 1.5, label: "Very fast" },
];

export default function Settings() {
  const [email, setEmail] = useState("");
  const [lang, setLang] = useState("en");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // TTS speed
  const [ttsRate, setTtsRate] = useState(() =>
    parseFloat(localStorage.getItem("iris_tts_rate") || "1")
  );

  // Change password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    api.me().then((m) => {
      setEmail(m.email);
      setLang(m.language);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function saveLang(code: string) {
    setLang(code);
    setSaved(false);
    try {
      await api.setLang(code);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently fail
    }
  }

  function saveTtsRate(rate: number) {
    setTtsRate(rate);
    localStorage.setItem("iris_tts_rate", String(rate));
    // Preview the new rate
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("This is how fast Iris will speak.");
      u.rate = rate;
      u.lang = "en-IN";
      window.speechSynthesis.speak(u);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (!currentPw) { setPwError("Enter your current password."); return; }
    if (newPw.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setPwBusy(true);
    try {
      await api.changePassword(currentPw, newPw);
      setPwSaved(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-6">
      <div className="mb-8 flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center justify-center rounded-xl border border-line p-2 text-muted hover:border-iris hover:text-bone transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-16 rounded-2xl shimmer" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Account */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
              <User size={14} />
              Account
            </div>
            <div className="rounded-xl bg-ink/50 px-4 py-3">
              <p className="text-xs text-muted mb-1">Email</p>
              <p className="text-bone font-medium">{email}</p>
            </div>
          </section>

          {/* Language */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
                <Globe size={14} />
                Default Language
              </div>
              {saved && (
                <span className="flex items-center gap-1 text-xs text-good fade-in-up">
                  <CheckCircle size={12} />
                  Saved
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => saveLang(l.code)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    lang === l.code
                      ? "border-iris bg-iris/15 text-bone"
                      : "border-line text-muted hover:border-iris/50 hover:bg-ink/50"
                  }`}
                >
                  <p className="font-semibold text-sm">{l.native}</p>
                  <p className="text-xs text-muted mt-0.5">{l.label}</p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              AI descriptions and voice output will use this language.
            </p>
          </section>

          {/* Voice Speed */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
              <AudioLines size={14} />
              Voice Speed
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {TTS_RATES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => saveTtsRate(r.value)}
                  className={`rounded-xl border px-2 py-2.5 text-center transition-all ${
                    ttsRate === r.value
                      ? "border-iris bg-iris/15 text-bone"
                      : "border-line text-muted hover:border-iris/50 hover:bg-ink/50"
                  }`}
                >
                  <p className="text-xs font-semibold leading-tight">{r.label}</p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Tap a speed to preview it. Applies to all voice descriptions.
            </p>
          </section>

          {/* Change Password */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
                <Lock size={14} />
                Change Password
              </div>
              {pwSaved && (
                <span className="flex items-center gap-1 text-xs text-good fade-in-up">
                  <CheckCircle size={12} />
                  Updated
                </span>
              )}
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Current password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 pr-10 text-sm text-bone placeholder:text-muted focus:border-iris focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-bone"
                    aria-label={showPw ? "Hide passwords" : "Show passwords"}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">New password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-bone placeholder:text-muted focus:border-iris focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Confirm new password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-3 text-sm text-bone placeholder:text-muted focus:border-iris focus:outline-none transition-colors"
                />
              </div>

              {pwError && (
                <div role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-2.5 text-xs text-bad">
                  {pwError}
                </div>
              )}

              <button
                type="submit"
                disabled={pwBusy}
                className="w-full rounded-xl bg-iris px-4 py-3 text-sm font-semibold text-ink hover:bg-irisdeep disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {pwBusy ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
                    Updating…
                  </span>
                ) : "Update password"}
              </button>
            </form>
          </section>

          {/* About */}
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
              <Info size={14} />
              About Iris
            </div>
            <div className="space-y-2 text-sm text-muted">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-bone">2.0</span>
              </div>
              <div className="flex justify-between">
                <span>AI Model</span>
                <span className="text-bone">Gemini 2.5 Flash</span>
              </div>
              <div className="flex justify-between">
                <span>Languages supported</span>
                <span className="text-bone">8</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted leading-relaxed">
              Iris is an AI-powered accessibility tool designed to help visually impaired users understand their surroundings through natural language descriptions.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
