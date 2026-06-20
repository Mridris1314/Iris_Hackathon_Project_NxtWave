import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Zap, Shield, Globe } from "lucide-react";
import { api, setToken } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  async function run() {
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setError("");
    setBusy(true);
    try {
      const res = mode === "login"
        ? await api.login(email, password)
        : await api.register(email, password);
      setToken(res.access_token);
      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const features = [
    { icon: Zap, title: "Instant AI Vision", desc: "Powered by Gemini 2.5 Flash" },
    { icon: Globe, title: "8 Languages", desc: "English, Hindi, Telugu & more" },
    { icon: Shield, title: "Secure & Private", desc: "Your data, your control" },
  ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-surface p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-iris/10 via-transparent to-transparent" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-iris/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-iris/8 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-iris">
            <div className="h-3 w-3 rounded-full bg-iris" />
          </div>
          <span className="font-display text-2xl font-bold">Iris</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight text-bone">
              AI eyes,<br />in your language.
            </h1>
            <p className="mt-4 text-lg text-muted leading-relaxed">
              Iris uses advanced AI vision to describe the world around you — instantly, accurately, and in the language you understand best.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-iris/15">
                  <Icon size={18} className="text-iris" />
                </div>
                <div>
                  <p className="font-semibold text-bone">{title}</p>
                  <p className="text-sm text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-muted">
          Designed for accessibility · Built for everyone
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-iris">
            <div className="h-2.5 w-2.5 rounded-full bg-iris" />
          </div>
          <span className="font-display text-xl font-bold">Iris</span>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-bone">
              {mode === "login" ? "Welcome back" : "Get started"}
            </h2>
            <p className="mt-2 text-muted">
              {mode === "login"
                ? "Sign in to your Iris account."
                : "Create your free Iris account."}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="mb-6 flex rounded-2xl border border-line bg-surface p-1">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                mode === "login" ? "bg-iris text-ink" : "text-muted hover:text-bone"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                mode === "register" ? "bg-iris text-ink" : "text-muted hover:text-bone"
              }`}
            >
              Create account
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-bone">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-bone placeholder:text-muted focus:border-iris focus:outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-bone">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && run()}
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 pr-12 text-bone placeholder:text-muted focus:border-iris focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-bone"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === "register" && (
                <p className="mt-1 text-xs text-muted">Minimum 6 characters.</p>
              )}
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={run}
              disabled={busy}
              className="mt-2 w-full rounded-2xl bg-iris px-6 py-4 text-base font-semibold text-ink transition hover:bg-irisdeep disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                mode === "login" ? "Sign in" : "Create account"
              )}
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-muted">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
