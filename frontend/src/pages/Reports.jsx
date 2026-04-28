import { useState } from "react";
import { Download, FileJson } from "lucide-react";
import api from "../api/client.js";

export default function Reports() {
  const [jsonPreview, setJsonPreview] = useState(null);
  const [err, setErr] = useState("");

  async function loadJson() {
    setErr("");
    try {
      const { data } = await api.get("/reports/summary.json");
      setJsonPreview(data);
    } catch (e) {
      setErr(e.response?.data?.error || "Could not load summary");
    }
  }

  async function downloadPoliciesCsv() {
    setErr("");
    try {
      const res = await api.get("/reports/policies.csv", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "policies-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.response?.data?.error || "Could not download CSV");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports & exports</h1>
        <p className="mt-1 text-sm text-slate-500">Admin-only — CSV for Excel; JSON for custom PDF pipelines</p>
      </div>

      {err && <p className="text-sm text-rose-600">{err}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={downloadPoliciesCsv}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200"
        >
          <Download className="h-6 w-6 text-blue-600" />
          <div>
            <p className="font-semibold text-slate-900">Policies CSV</p>
            <p className="text-xs text-slate-500">Download using your session (authorized request)</p>
          </div>
        </button>
        <button
          type="button"
          onClick={loadJson}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200"
        >
          <FileJson className="h-6 w-6 text-violet-600" />
          <div>
            <p className="font-semibold text-slate-900">Summary JSON</p>
            <p className="text-xs text-slate-500">Load aggregates in-page</p>
          </div>
        </button>
      </div>

      <p className="text-xs text-slate-500">
        For PDFs, pipe the JSON summary into your renderer or add a server-side PDF service when you are ready for production.
      </p>

      {jsonPreview && (
        <pre className="max-h-96 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-emerald-100">
          {JSON.stringify(jsonPreview, null, 2)}
        </pre>
      )}
    </div>
  );
}
