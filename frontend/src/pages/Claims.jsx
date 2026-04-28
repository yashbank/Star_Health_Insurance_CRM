import { useEffect, useState } from "react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));

function claimRowTone(status) {
  if (status === "Under Review") return "bg-amber-50/80";
  if (status === "Filed") return "bg-sky-50/50";
  if (status === "Rejected") return "bg-rose-50/60";
  return "";
}

export default function Claims() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [form, setForm] = useState({ client_id: "", policy_id: "", claim_number: "", description: "", status: "Filed", amount: "" });

  async function load() {
    const { data } = await api.get("/claims", {
      params: { status: status || undefined, from: from || undefined, to: to || undefined },
    });
    setRows(data);
  }

  useEffect(() => {
    load().catch(() => {});
  }, [status, from, to]);

  useEffect(() => {
    api.get("/clients", { params: { pageSize: 100 } }).then((r) => setClients(r.data.items || []));
  }, []);

  async function add(e) {
    e.preventDefault();
    await api.post("/claims", {
      ...form,
      policy_id: form.policy_id || null,
      claim_number: form.claim_number || undefined,
      amount: form.amount ? Number(form.amount) : null,
    });
    setForm({ client_id: "", policy_id: "", claim_number: "", description: "", status: "Filed", amount: "" });
    load();
  }

  async function patch(id, body) {
    await api.patch(`/claims/${id}`, body);
    load();
  }

  async function del(id) {
    if (!confirm("Delete claim?")) return;
    await api.delete(`/claims/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Claims</h1>
        <p className="text-sm text-slate-500">Track claim status and amounts.</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:p-4">
        <select
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto sm:min-w-[11rem]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option>Filed</option>
          <option>Under Review</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>Closed</option>
        </select>
        <input
          type="date"
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="date"
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <form onSubmit={add} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Add claim</h2>
        <select
          required
          className="rounded-lg border px-3 py-2 text-sm"
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
        >
          <option value="">Client *</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Amount"
          className="rounded-lg border px-3 py-2 text-sm"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <select className="rounded-lg border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>Filed</option>
          <option>Under Review</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>Closed</option>
        </select>
        <input
          className="rounded-lg border px-3 py-2 text-sm font-mono"
          placeholder="Policy UUID (optional)"
          value={form.policy_id}
          onChange={(e) => setForm({ ...form, policy_id: e.target.value })}
        />
        <input
          className="rounded-lg border px-3 py-2 text-sm font-mono"
          placeholder="Claim number (optional)"
          value={form.claim_number}
          onChange={(e) => setForm({ ...form, claim_number: e.target.value })}
        />
        <textarea
          className="md:col-span-2 rounded-lg border px-3 py-2 text-sm"
          rows={2}
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Save claim
        </button>
      </form>

      <div className="table-scroll rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Claim #</th>
              <th className="px-4 py-3 font-medium">Policy</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={`border-t border-slate-100 ${claimRowTone(c.status)}`}>
                <td className="px-4 py-3">
                  <div className="font-medium">{c.client_name}</div>
                  <div className="text-xs text-slate-500">{c.client_phone}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.claim_number || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{c.policy_number || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    className={`rounded border px-2 py-1 text-xs font-medium ${
                      c.status === "Under Review" ? "border-amber-300 bg-amber-100 text-amber-950" : ""
                    }`}
                    value={c.status}
                    onChange={(e) => patch(c.id, { status: e.target.value })}
                  >
                    <option>Filed</option>
                    <option>Under Review</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                    <option>Closed</option>
                  </select>
                </td>
                <td className="px-4 py-3">{inr(c.amount)}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600">{c.description || "—"}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && (
                    <button type="button" className="text-rose-600 hover:underline" onClick={() => del(c.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
