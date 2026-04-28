import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));

function expiryDot(light) {
  if (light === "red") return "bg-rose-500";
  if (light === "yellow") return "bg-amber-400";
  if (light === "green") return "bg-emerald-500";
  return "bg-slate-300";
}

export default function Policies() {
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "assistant1" || user?.role === "assistant2";
  const isAdmin = user?.role === "admin";
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [form, setForm] = useState({
    client_id: "",
    policy_number: "",
    status: "Active",
    sum_insured: "",
    details: "",
    backoffice_query_notes: "",
  });

  async function load() {
    const { data } = await api.get("/policies", {
      params: {
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      },
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
    try {
      await api.post("/policies", {
        ...form,
        client_id: form.client_id,
        sum_insured: form.sum_insured ? Number(form.sum_insured) : null,
      });
      setForm({
        client_id: "",
        policy_number: "",
        status: "Active",
        sum_insured: "",
        details: "",
        backoffice_query_notes: "",
      });
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Could not save");
    }
  }

  async function patch(id, patch) {
    await api.patch(`/policies/${id}`, patch);
    load();
  }

  async function del(id) {
    if (!confirm("Delete policy?")) return;
    await api.delete(`/policies/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Policies</h1>
        <p className="text-sm text-slate-500">Star Health desk — status, documents, and assignments (assistants see their queue).</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:p-4">
        <select
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto sm:min-w-[11rem]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option>Active</option>
          <option>Pending Payment</option>
          <option>Lapsed</option>
          <option>Renewal Due</option>
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

      {canWrite && (
        <form onSubmit={add} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold">Add policy</h2>
          <select
            required
            className="rounded-lg border px-3 py-2 text-sm"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          >
            <option value="">Select client *</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
          <input
            placeholder="Policy number"
            className="rounded-lg border px-3 py-2 text-sm"
            value={form.policy_number}
            onChange={(e) => setForm({ ...form, policy_number: e.target.value })}
          />
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option>Active</option>
            <option>Pending Payment</option>
            <option>Lapsed</option>
            <option>Renewal Due</option>
          </select>
          <input
            type="number"
            placeholder="Sum insured"
            className="rounded-lg border px-3 py-2 text-sm"
            value={form.sum_insured}
            onChange={(e) => setForm({ ...form, sum_insured: e.target.value })}
          />
          <textarea
            className="md:col-span-2 rounded-lg border px-3 py-2 text-sm"
            rows={2}
            placeholder="Details"
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
          />
          <textarea
            className="md:col-span-2 rounded-lg border px-3 py-2 text-sm"
            rows={2}
            placeholder="Backoffice query notes"
            value={form.backoffice_query_notes}
            onChange={(e) => setForm({ ...form, backoffice_query_notes: e.target.value })}
          />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Save policy
          </button>
        </form>
      )}

      <div className="table-scroll rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[800px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Policy</th>
              <th className="px-4 py-3 font-medium">End date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Sum / premium</th>
              <th className="px-4 py-3 font-medium">Query notes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.client_name}</div>
                  <div className="text-xs text-slate-500">{p.client_phone}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${expiryDot(p.expiry_traffic_light)}`} title="Expiry urgency" />
                    <Link className="font-mono text-sm font-medium text-blue-700 hover:underline" to={`/policies/${p.id}`}>
                      {p.policy_number || "View"}
                    </Link>
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {p.insurance_company || "Star Health"} · {p.product_name || p.policy_type || "—"}
                  </div>
                </td>
                <td className={`px-4 py-3 text-sm ${p.end_date ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                  {p.end_date || "—"}
                </td>
                <td className="px-4 py-3">
                  {canWrite ? (
                    <select
                      className="rounded border px-2 py-1 text-xs"
                      value={p.status}
                      onChange={(e) => patch(p.id, { status: e.target.value })}
                    >
                      <option>Active</option>
                      <option>Pending Payment</option>
                      <option>Lapsed</option>
                      <option>Renewal Due</option>
                    </select>
                  ) : (
                    p.status
                  )}
                </td>
                <td className="px-4 py-3">
                  <div>{inr(p.sum_insured)}</div>
                  {p.premium != null && <div className="text-xs text-slate-500">Prem {inr(p.premium)}</div>}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600">{p.backoffice_query_notes || "—"}</td>
                <td className="space-y-1 px-4 py-3">
                  {canWrite && (
                    <label className="block text-xs text-blue-600 hover:underline">
                      Upload
                      <input
                        type="file"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          await api.post(`/policies/${p.id}/documents`, fd, {
                            headers: { "Content-Type": "multipart/form-data" },
                          });
                          e.target.value = "";
                          load();
                        }}
                      />
                    </label>
                  )}
                  {isAdmin && (
                    <button type="button" className="block text-xs text-rose-600 hover:underline" onClick={() => del(p.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Bulk import (CSV)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Required columns: <span className="font-mono">client_id</span>, <span className="font-mono">policy_number</span>. Optional:{" "}
            <span className="font-mono">insurance_company</span>, <span className="font-mono">policy_type</span>, <span className="font-mono">status</span>,{" "}
            <span className="font-mono">premium</span>, <span className="font-mono">assigned_assistant_id</span>, <span className="font-mono">product_name</span>,{" "}
            <span className="font-mono">sum_insured</span>.
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
            Choose CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("file", file);
                try {
                  const { data } = await api.post("/policies/import-csv", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });
                  alert(`Imported ${data.inserted} rows. ${data.errors?.length ? data.errors.length + " errors — see console." : ""}`);
                  if (data.errors?.length) console.warn(data.errors);
                  load();
                } catch (err) {
                  alert(err.response?.data?.error || "Import failed");
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
