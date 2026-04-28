import { useState } from "react";
import { Mail } from "lucide-react";
import api from "../api/client.js";

export default function GenerateEmail({ purpose = "Client follow-up", context = "" }) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  async function run() {
    setLoading(true);
    try {
      const { data } = await api.post("/ai/generate-email", { purpose, context });
      setText(data.text || data.fallback || "");
    } catch (e) {
      const d = e.response?.data;
      if (d?.fallback) setText(d.fallback);
      else setText(d?.error || "Could not generate email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800">AI email draft</h3>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Mail className="h-4 w-4" />
          {loading ? "Generating…" : "Generate email"}
        </button>
      </div>
      {text && (
        <textarea
          readOnly
          className="min-h-40 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}
      <p className="mt-2 text-xs text-slate-500">Set OPENAI_API_KEY on the server for live AI; otherwise a sample draft may appear.</p>
    </div>
  );
}
