import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Loader2, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { backendUrl } from "../lib/apiOrigin.js";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@crm.local");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiOk, setApiOk] = useState(null);

  useEffect(() => {
    let cancel = false;
    async function ping() {
      try {
        const r = await fetch(backendUrl("/health"), { method: "GET" });
        if (!cancel) setApiOk(r.ok);
      } catch {
        if (!cancel) setApiOk(false);
      }
    }
    ping();
    const id = setInterval(ping, 15000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      const status = e.response?.status;
      const serverMsg = e.response?.data?.error;
      if (!e.response && e.message === "Network Error") {
        setErr(
          "Cannot reach the API. Start the backend on port 4000 (e.g. npm run dev from the repo root) and open this app through Vite (http://localhost:5173 or http://127.0.0.1:5173)."
        );
        setApiOk(false);
      } else if (status === 401) {
        setErr("Invalid email or password.");
      } else if (status === 503) {
        setErr(
          serverMsg ||
            "Database is not reachable. For embedded DB set USE_PGLITE=1 in backend/.env, or start Postgres and run db:init / db:seed."
        );
      } else if (status === 500) {
        setErr(serverMsg || "Server error — check the API terminal for details.");
      } else {
        setErr(serverMsg || e.message || "Sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgb(59 130 246 / 0.45), transparent 45%),
            radial-gradient(circle at 80% 10%, rgb(16 185 129 / 0.25), transparent 40%),
            radial-gradient(circle at 50% 90%, rgb(99 102 241 / 0.35), transparent 45%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/40">
            <Shield className="h-7 w-7 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Star Health Insurance CRM</h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to manage leads, customers, policies, renewals, and claims
          </p>
          <div
            className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              apiOk === null
                ? "border-slate-600 bg-slate-900/60 text-slate-400"
                : apiOk
                  ? "border-emerald-500/40 bg-emerald-950/50 text-emerald-300"
                  : "border-amber-500/40 bg-amber-950/50 text-amber-200"
            }`}
          >
            {apiOk === null ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking API…
              </>
            ) : apiOk ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                API reachable
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                API offline — start backend
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Email</label>
              <input
                type="email"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-blue-500/40 placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-2"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Password</label>
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-blue-500/40 placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-2"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {err && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">{err}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
            <dl className="mt-3 space-y-2 text-sm text-slate-300">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Admin</dt>
                <dd className="text-right font-mono text-xs text-slate-200">admin@crm.local · admin123</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Assistants</dt>
                <dd className="text-right font-mono text-xs leading-relaxed text-slate-200">
                  assistant1@crm.local / assistant2@crm.local
                  <br />
                  <span className="text-slate-400">assist123</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          PGlite dev tip: if login never works, stop the API, delete <code className="text-slate-500">backend/.data/pglite</code>, then start again. Optional:{" "}
          <code className="text-slate-500">PGLITE_FORCE_RESEED=1</code> in <code className="text-slate-500">backend/.env</code>.
        </p>
      </div>
    </div>
  );
}
