import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, LogOut, Settings, Volume2, VolumeX, RotateCcw, Upload, Mic, MicOff, Copy, Share2 } from "lucide-react";
import { api, clearToken } from "../api";
import { LANGUAGES, langByCode } from "../lib/languages";
import { MODES, type Mode } from "../lib/modes";

type Status = "ready" | "looking" | "speaking";

const VOICE_TRIGGERS = ["describe", "scan", "capture", "iris", "go", "yes", "okay", "take"];

function WaveIcon() {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {[1,2,3,4,5].map((i) => (
        <div
          key={i}
          className="wave-bar w-1 rounded-full bg-iris"
          style={{ height: `${[60,100,80,100,60][i-1]}%` }}
        />
      ))}
    </div>
  );
}

function makeThumbnail(sourceCanvas: HTMLCanvasElement): string {
  const MAX = 200;
  const ratio = Math.min(MAX / sourceCanvas.width, MAX / sourceCanvas.height);
  const thumb = document.createElement("canvas");
  thumb.width = Math.round(sourceCanvas.width * ratio);
  thumb.height = Math.round(sourceCanvas.height * ratio);
  thumb.getContext("2d")?.drawImage(sourceCanvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/jpeg", 0.6);
}

export default function Home() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceActiveRef = useRef(false);

  const [lang, setLang] = useState("en");
  const [mode, setMode] = useState<Mode>("scene");
  const [status, setStatus] = useState<Status>("ready");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [camReady, setCamReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (muted) window.speechSynthesis?.cancel();
  }, [muted]);

  const speak = useCallback((text: string, langCode: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || muted) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const tag = langByCode(langCode).speech;
    u.lang = tag;
    u.rate = parseFloat(localStorage.getItem("iris_tts_rate") || "1");
    const voices = window.speechSynthesis.getVoices();
    const match =
      voices.find((v) => v.lang === tag) ||
      voices.find((v) => v.lang.startsWith(langCode));
    if (match) u.voice = match;
    window.speechSynthesis.speak(u);
  }, [muted]);

  useEffect(() => {
    let active = true;
    api.me().then((m) => {
      if (!active) return;
      setLang(m.language);
      setUserEmail(m.email);
    }).catch(() => {});

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamReady(true);
      } catch {
        setError("Camera unavailable. Upload a photo instead.");
      }
      setTimeout(
        () => speak("Iris is ready. Tap the button to describe what is in front of you.", "en"),
        800
      );
    })();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
      stopVoice();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const describe = useCallback(
    async (imageDataUrl: string, thumbnail?: string) => {
      setError("");
      setResult("");
      setStatus("looking");
      try {
        const data = await api.describe(imageDataUrl, mode, lang, thumbnail);
        setResult(data.text);
        setStatus("speaking");
        speak(data.text, lang);
        setTimeout(() => setStatus("ready"), 500);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        setError(msg);
        speak(msg, lang);
        setStatus("ready");
      }
    },
    [mode, lang, speak]
  );

  const capture = useCallback(() => {
    if (status === "looking") return;
    navigator.vibrate?.(150);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !camReady || video.videoWidth === 0) {
      fileRef.current?.click();
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    describe(canvas.toDataURL("image/jpeg", 0.85), makeThumbnail(canvas));
  }, [status, camReady, describe]);

  function stopVoice() {
    voiceActiveRef.current = false;
    setVoiceMode(false);
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      speak("Voice commands are not supported on this browser.", "en");
      return;
    }
    const rec: SpeechRecognition = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .toLowerCase()
        .trim();
      const triggered = VOICE_TRIGGERS.some((w) => transcript.includes(w));
      if (triggered) capture();
    };

    rec.onend = () => {
      if (voiceActiveRef.current) {
        try { rec.start(); } catch {}
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed") {
        speak("Microphone access was denied.", "en");
        stopVoice();
      }
    };

    voiceActiveRef.current = true;
    setVoiceMode(true);
    rec.start();
    recognitionRef.current = rec;
    speak("Voice mode on. Say describe, scan, or go to capture.", "en");
  }

  function toggleVoice() {
    if (voiceMode) {
      stopVoice();
      speak("Voice mode off.", "en");
    } else {
      startVoice();
    }
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d")?.drawImage(img, 0, 0);
        describe(dataUrl, makeThumbnail(c));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  async function changeLang(code: string) {
    setLang(code);
    api.setLang(code).catch(() => {});
  }

  function signOut() {
    clearToken();
    navigate("/login");
  }

  function reSpeak() {
    if (result) speak(result, lang);
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / HTTP
      const el = document.createElement("textarea");
      el.value = result;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function shareResult() {
    if (!result) return;
    navigator.share?.({ text: result });
  }

  const currentMode = MODES.find((m) => m.id === mode)!;

  return (
    <main className="flex min-h-screen flex-col bg-ink">
      {/* Header */}
      <header className="z-20 flex items-center justify-between gap-3 px-5 py-4 border-b border-line/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-iris">
            <div className="h-2 w-2 rounded-full bg-iris" />
          </div>
          <span className="font-display text-xl font-bold">Iris</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            id="lang"
            value={lang}
            onChange={(e) => changeLang(e.target.value)}
            aria-label="Language"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-bone focus:border-iris focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>

          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="rounded-xl border border-line bg-surface p-2 text-muted hover:border-iris hover:text-bone transition-colors"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <Link
            to="/history"
            className="rounded-xl border border-line bg-surface p-2 text-muted hover:border-iris hover:text-bone transition-colors"
            aria-label="History"
          >
            <Clock size={16} />
          </Link>

          <Link
            to="/settings"
            className="rounded-xl border border-line bg-surface p-2 text-muted hover:border-iris hover:text-bone transition-colors"
            aria-label="Settings"
          >
            <Settings size={16} />
          </Link>

          <button
            onClick={signOut}
            className="rounded-xl border border-line bg-surface p-2 text-muted hover:border-bad/60 hover:text-bad transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Camera viewport */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: camReady ? 0.45 : 0 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-transparent to-ink/90" />

        {/* Scanning indicator */}
        {status === "looking" && (
          <div className="absolute inset-x-0 top-0 h-0.5 scan-line bg-gradient-to-r from-transparent via-iris to-transparent" />
        )}

        {/* Voice mode banner */}
        {voiceMode && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 bg-iris/20 border-b border-iris/30 py-2 fade-in-up">
            <span className="h-2 w-2 rounded-full bg-iris animate-pulse" />
            <span className="text-xs font-medium text-iris">Voice mode on — say "describe" or "go"</span>
          </div>
        )}

        {/* Center capture zone */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
          {/* Mode badge */}
          <div className="glass rounded-full border border-iris/30 px-4 py-1.5">
            <span className="text-sm font-medium text-iris">{currentMode.label}</span>
          </div>

          {/* Main capture button */}
          <button
            onClick={capture}
            disabled={status === "looking"}
            aria-label={status === "looking" ? "Analyzing…" : `Capture — ${currentMode.label}`}
            className="group relative focus:outline-none disabled:cursor-wait"
          >
            <div
              className={`flex h-36 w-36 items-center justify-center rounded-full border-[5px] border-iris transition-all duration-300 ${
                status === "ready" ? "iris-pulse" : ""
              } ${status === "looking" ? "opacity-80 scale-95" : "group-hover:scale-105"}`}
              style={{
                background: "radial-gradient(circle at 50% 45%, rgba(232,163,61,0.15), transparent 70%)",
              }}
            >
              {status === "looking" ? (
                <div className="h-8 w-8 rounded-full border-3 border-iris/30 border-t-iris animate-spin" />
              ) : status === "speaking" ? (
                <WaveIcon />
              ) : (
                <span className="font-display text-base font-semibold text-iris">Iris</span>
              )}
            </div>
          </button>

          <p className="font-display text-xl font-semibold text-bone">
            {status === "looking" ? "Analyzing…" : status === "speaking" ? "Speaking…" : "Tap to describe"}
          </p>

          {/* Voice + Upload row */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleVoice}
              aria-label={voiceMode ? "Turn off voice mode" : "Turn on voice mode"}
              aria-pressed={voiceMode}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all ${
                voiceMode
                  ? "border-iris bg-iris/20 text-iris"
                  : "border-line bg-surface/80 text-muted hover:border-iris hover:text-bone"
              }`}
            >
              {voiceMode ? <MicOff size={15} /> : <Mic size={15} />}
              {voiceMode ? "Voice on" : "Voice"}
            </button>

            {status === "ready" && (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-2xl border border-line bg-surface/80 px-4 py-2.5 text-sm text-bone hover:border-iris transition-colors"
              >
                <Upload size={15} />
                Upload
              </button>
            )}
          </div>
        </div>

        {/* Result card */}
        {(result || error) && (
          <div className="absolute inset-x-0 bottom-0 z-10 p-4 fade-in-up">
            <div
              className={`glass mx-auto max-w-2xl rounded-2xl border px-5 py-4 ${
                error ? "border-bad/40" : "border-iris/30"
              }`}
            >
              <p
                role="status"
                aria-live="assertive"
                aria-atomic="true"
                className={`text-base leading-relaxed ${error ? "text-bad" : "text-bone"}`}
              >
                {error || result}
              </p>
              {result && !error && (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={reSpeak}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-iris transition-colors"
                  >
                    <Volume2 size={13} />
                    Repeat
                  </button>
                  <button
                    onClick={copyResult}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-iris transition-colors"
                    aria-label="Copy description"
                  >
                    <Copy size={13} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  {"share" in navigator && (
                    <button
                      onClick={shareResult}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-iris transition-colors"
                      aria-label="Share description"
                    >
                      <Share2 size={13} />
                      Share
                    </button>
                  )}
                  <button
                    onClick={() => { setResult(""); setError(""); }}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-iris transition-colors"
                  >
                    <RotateCcw size={13} />
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mode selector */}
      <nav className="z-20 flex items-stretch gap-2 border-t border-line/50 bg-ink px-4 py-3" aria-label="Modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
            className={`flex-1 rounded-2xl border px-3 py-3 text-center transition-all ${
              mode === m.id
                ? "border-iris bg-iris/15 text-bone"
                : "border-line text-muted hover:border-iris/50 hover:bg-surface"
            }`}
          >
            <span className="block text-sm font-semibold">{m.label}</span>
            <span className="mt-0.5 block text-xs text-muted">{m.hint}</span>
          </button>
        ))}
      </nav>

      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
    </main>
  );
}
