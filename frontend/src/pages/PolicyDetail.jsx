import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import api from "../api/client.js";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));

function trafficBadge(light) {
  if (light === "red") return "bg-rose-100 text-rose-800 border-rose-200";
  if (light === "yellow") return "bg-amber-100 text-amber-900 border-amber-200";
  if (light === "green") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function PolicyDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [aiEmail, setAiEmail] = useState("");
  const [aiReminder, setAiReminder] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/policies/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.error || "Could not load policy"));
  }, [id]);

  async function generateEmail() {
    if (!data) return;
    const p = data.policy;
    setAiBusy(true);
    setAiEmail("");
    try {
      const { data: out } = await api.post("/ai/generate-email", {
        purpose: "Email to insurer backoffice for policy servicing / endorsement",
        context: [
          `Policy: ${p.policy_number || "—"}`,
          `Product: ${p.product_name || p.details || "—"}`,
          `Client: ${p.client_name} (${p.client_phone})`,
          `Status: ${p.status}`,
          `Coverage total: ${p.total_coverage != null ? inr(p.total_coverage) : inr(p.sum_insured)}`,
          `Premium: ${p.premium != null ? inr(p.premium) : "—"}`,
          `End date: ${p.end_date || "—"}`,
          `Office: ${p.office_name || ""}`,
        ].join("\n"),
      });
      setAiEmail(out.text || out.fallback || "");
    } catch (e) {
      setAiEmail(e.response?.data?.fallback || e.response?.data?.error || "Could not generate");
    } finally {
      setAiBusy(false);
    }
  }

  async function generateReminder() {
    if (!data) return;
    const p = data.policy;
    setAiBusy(true);
    setAiReminder("");
    try {
      const { data: out } = await api.post("/ai/generate-reminder", {
        clientName: p.client_name,
        renewalDate: p.end_date || p.client_renewal_date,
        policyNumber: p.policy_number,
        tone: "Short SMS-style, respectful Hindi-English mix acceptable",
      });
      setAiReminder(out.text || out.fallback || "");
    } catch (e) {
      setAiReminder(e.response?.data?.fallback || e.response?.data?.error || "Could not generate");
    } finally {
      setAiBusy(false);
    }
  }

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <p className="text-slate-500">Loading…</p>;

  const p = data.policy;
  const cov = data.coverage || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/policies" className="text-sm font-medium text-blue-600 hover:underline">
            ← Policies
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Policy detail</h1>
          <p className="text-sm text-slate-500">
            {p.client_name} · {p.client_phone}
          </p>
        </div>
        {p.expiry_traffic_light && (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${trafficBadge(p.expiry_traffic_light)}`}>
            Expiry urgency: {p.expiry_traffic_light}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800">Schedule</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Policy number</dt>
              <dd className="font-mono font-medium text-slate-900">{p.policy_number || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Previous policy</dt>
              <dd className="font-mono text-slate-800">{p.previous_policy_number || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Product</dt>
              <dd className="font-medium text-slate-900">{p.product_name || p.details || "—"}</dd>
            </div>
            <div>
              <dt className="text-rose-600 font-medium">End date</dt>
              <dd className="font-semibold text-slate-900">
                {p.end_date ? format(new Date(p.end_date), "dd MMM yyyy") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Start date</dt>
              <dd>{p.start_date ? format(new Date(p.start_date), "dd MMM yyyy") : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Term / frequency</dt>
              <dd>
                {p.policy_term || "—"} · {p.payment_frequency || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Zone / scheme</dt>
              <dd>
                {p.zone || "—"} · {p.scheme || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Advisor / intermediary code</dt>
              <dd className="font-mono text-xs text-slate-800">
                {p.advisor_code || "—"} / {p.intermediary_code || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Office</dt>
              <dd>{p.office_name || "—"}</dd>
              <dd className="text-xs text-slate-600">{p.office_address || ""}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">{p.status}</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-blue-900">Coverage breakdown</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-blue-800/80">Base sum insured</dt>
              <dd className="font-semibold text-blue-950">{inr(cov.base_sum_insured ?? p.sum_insured)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-blue-800/80">Bonus</dt>
              <dd className="font-semibold text-blue-950">{inr(cov.bonus_amount)}</dd>
            </div>
            <div className="flex justify-between border-t border-blue-200 pt-2">
              <dt className="font-medium text-blue-900">Total coverage</dt>
              <dd className="text-lg font-bold text-blue-950">{inr(cov.total_coverage ?? p.sum_insured)}</dd>
            </div>
            <div className="text-xs text-blue-900/80">{cov.recharge_benefit || p.recharge_benefit || "—"}</div>
            <div className="flex justify-between pt-2">
              <dt className="font-medium text-blue-900">Premium</dt>
              <dd className="font-bold text-blue-950">{p.premium != null ? inr(p.premium) : "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Insured members</h2>
          <div className="table-scroll mt-3">
            <table className="min-w-[520px] w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Relation</th>
                  <th className="py-2 pr-3 font-medium">Age</th>
                  <th className="py-2 pr-3 font-medium">Gender</th>
                  <th className="py-2 font-medium">PED</th>
                </tr>
              </thead>
              <tbody>
                {(data.members || []).map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">{m.name}</td>
                    <td className="py-2 pr-3">{m.relation || "—"}</td>
                    <td className="py-2 pr-3">{m.age ?? "—"}</td>
                    <td className="py-2 pr-3">{m.gender || "—"}</td>
                    <td className="py-2 text-slate-600">{m.pre_existing_disease || "—"}</td>
                  </tr>
                ))}
                {(!data.members || data.members.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-4 text-slate-500">
                      No members on file.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Nominees</h2>
          <div className="table-scroll mt-3">
            <table className="min-w-[520px] w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Relation</th>
                  <th className="py-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {(data.nominees || []).map((n) => (
                  <tr key={n.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">{n.name}</td>
                    <td className="py-2 pr-3">{n.relation || "—"}</td>
                    <td className="py-2">{n.percentage != null ? `${n.percentage}%` : "—"}</td>
                  </tr>
                ))}
                {(!data.nominees || data.nominees.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-500">
                      No nominees on file.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">AI actions</h2>
        <p className="text-sm text-slate-500">Uses OpenAI when `OPENAI_API_KEY` is set; otherwise shows a template.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={aiBusy}
            onClick={generateEmail}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Generate email
          </button>
          <button
            type="button"
            disabled={aiBusy}
            onClick={generateReminder}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            Send reminder
          </button>
        </div>
        {aiEmail && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-wrap">{aiEmail}</pre>
        )}
        {aiReminder && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-amber-50 p-3 text-xs text-amber-950 whitespace-pre-wrap">{aiReminder}</pre>
        )}
      </div>
    </div>
  );
}
