import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, Volume2, Search, BarChart3, Copy, Share2 } from "lucide-react";
import { api, type Scan, type Stats } from "../api";
import { langByCode } from "../lib/languages";
import { MODES } from "../lib/modes";

const MODE_COLORS: Record<string, string> = {
  scene: "bg-good/15 text-good border-good/30",
  text: "bg-iris/15 text-iris border-iris/30",
  object: "bg-[#818CF8]/15 text-[#818CF8] border-[#818CF8]/30",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-center">
      <p className="font-display text-2xl font-bold text-bone">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}

export default function History() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.history(), api.stats()])
      .then(([h, s]) => {
        setScans(h);
        setStats(s);
        if (h.length > 0) {
          const summary = `You have ${s.total_scans} scan${s.total_scans !== 1 ? "s" : ""}. Most recent: ${h[0].result}`;
          setTimeout(() => speak(summary, h[0].language), 600);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function speak(text: string, langCode: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const tag = langByCode(langCode).speech;
    u.lang = tag;
    u.rate = parseFloat(localStorage.getItem("iris_tts_rate") || "1");
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang === tag) || voices.find((v) => v.lang.startsWith(langCode));
    if (match) u.voice = match;
    window.speechSynthesis.speak(u);
  }

  async function deleteScan(id: number) {
    setDeleting(id);
    try {
      await api.deleteScan(id);
      setScans((prev) => prev.filter((s) => s.id !== id));
      if (stats) setStats({ ...stats, total_scans: stats.total_scans - 1 });
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
  }

  async function copyScan(id: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function shareScan(text: string) {
    navigator.share?.({ text });
  }

  const filtered = scans.filter((s) =>
    !search || s.result.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center justify-center rounded-xl border border-line p-2 text-muted hover:border-iris hover:text-bone transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-display text-2xl font-bold">History</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5">
          <BarChart3 size={14} className="text-iris" />
          <span className="text-sm text-muted">{stats?.total_scans ?? 0} scans</span>
        </div>
      </div>

      {/* Stats row */}
      {stats && stats.total_scans > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatCard label="Scenes" value={stats.scene_scans} />
          <StatCard label="Text reads" value={stats.text_scans} />
          <StatCard label="Objects" value={stats.object_scans} />
        </div>
      )}

      {/* Search */}
      {scans.length > 0 && (
        <div className="mb-4 relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search descriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-line bg-surface pl-10 pr-4 py-3 text-sm text-bone placeholder:text-muted focus:border-iris focus:outline-none transition-colors"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-24 rounded-2xl shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-5 py-12 text-center">
          {scans.length === 0 ? (
            <>
              <p className="text-2xl mb-2">👁</p>
              <p className="font-semibold text-bone">No scans yet</p>
              <p className="mt-1 text-sm text-muted">Go back and tap to describe what's in front of you.</p>
              <Link
                to="/"
                className="mt-4 inline-block rounded-2xl bg-iris px-5 py-2.5 text-sm font-semibold text-ink hover:bg-irisdeep transition-colors"
              >
                Start scanning
              </Link>
            </>
          ) : (
            <>
              <p className="font-semibold text-bone">No results</p>
              <p className="mt-1 text-sm text-muted">No descriptions match "{search}".</p>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => {
            const modeLabel = MODES.find((m) => m.id === s.mode)?.label ?? s.mode;
            const modeColor = MODE_COLORS[s.mode] ?? "bg-line text-muted border-line";
            const date = new Date(s.created_at);
            return (
              <li key={s.id} className="fade-in-up rounded-2xl border border-line bg-surface px-5 py-4 transition-all hover:border-line/80">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${modeColor}`}>
                      {modeLabel}
                    </span>
                    <span className="text-xs text-muted">{langByCode(s.language).native}</span>
                    <span className="text-xs text-muted">
                      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {" · "}
                      {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => speak(s.result, s.language)}
                      className="rounded-lg p-1.5 text-muted hover:text-iris transition-colors"
                      aria-label="Read aloud"
                    >
                      <Volume2 size={14} />
                    </button>
                    <button
                      onClick={() => copyScan(s.id, s.result)}
                      className="rounded-lg p-1.5 text-muted hover:text-iris transition-colors"
                      aria-label="Copy description"
                    >
                      {copiedId === s.id ? (
                        <span className="text-[10px] text-iris font-semibold">✓</span>
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    {"share" in navigator && (
                      <button
                        onClick={() => shareScan(s.result)}
                        className="rounded-lg p-1.5 text-muted hover:text-iris transition-colors"
                        aria-label="Share description"
                      >
                        <Share2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteScan(s.id)}
                      disabled={deleting === s.id}
                      className="rounded-lg p-1.5 text-muted hover:text-bad transition-colors disabled:opacity-40"
                      aria-label="Delete"
                    >
                      {deleting === s.id ? (
                        <span className="h-3.5 w-3.5 rounded-full border border-muted border-t-bad animate-spin block" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  {s.thumbnail && (
                    <img
                      src={s.thumbnail}
                      alt=""
                      aria-hidden="true"
                      className="h-14 w-14 flex-shrink-0 rounded-xl object-cover border border-line"
                    />
                  )}
                  <p className="text-sm leading-relaxed text-bone">{s.result}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
