import { useEffect, useState } from "react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

function urgencyBar(light) {
  if (light === "red") return "border-l-4 border-l-rose-500 bg-rose-50/40";
  if (light === "yellow") return "border-l-4 border-l-amber-400 bg-amber-50/40";
  if (light === "green") return "border-l-4 border-l-emerald-500 bg-emerald-50/30";
  return "border-l-4 border-l-slate-200";
}

export default function Renewals() {
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "assistant1" || user?.role === "assistant2";
  const isAdmin = user?.role === "admin";
  const [rows, setRows] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ status: "", advisorId: "", from: "", to: "" });
  const [form, setForm] = useState({ client_id: "", renewal_date: "", status: "Not Contacted", reminder_date: "" });
  const [callNote, setCallNote] = useState({});
  const [aiBox, setAiBox] = useState({});

  async function load() {
    const { data } = await api.get("/renewals", {
      params: {
        status: filters.status || undefined,
        advisorId: filters.advisorId || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      },
    });
    setRows(data);
    const u = await api.get("/renewals/upcoming", { params: { days: 90 } });
    setUpcoming(u.data);
  }

  useEffect(() => {
    load().catch(() => {});
  }, [filters.status, filters.advisorId, filters.from, filters.to]);

  useEffect(() => {
    api.get("/advisors", { params: { pageSize: 500 } }).then((r) => setAdvisors(r.data.items || []));
    api.get("/clients", { params: { pageSize: 100 } }).then((r) => setClients(r.data.items || []));
  }, []);

  async function add(e) {
    e.preventDefault();
    try {
      await api.post("/renewals", form);
      setForm({ client_id: "", renewal_date: "", status: "Not Contacted", reminder_date: "" });
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Could not save");
    }
  }

  async function patch(id, body) {
    await api.patch(`/renewals/${id}`, body);
    load();
  }

  async function addLog(id) {
    const note = callNote[id]?.trim();
    if (!note) return;
    await api.post(`/renewals/${id}/call-log`, { note });
    setCallNote({ ...callNote, [id]: "" });
    load();
  }

  async function genEmail(row) {
    try {
      const { data } = await api.post("/ai/generate-email", {
        purpose: "Renewal coordination with client and insurer",
        context: `Client: ${row.client_name} (${row.client_phone}). Renewal date: ${row.renewal_date}. Status: ${row.status}.`,
      });
      setAiBox((s) => ({ ...s, [row.id]: { type: "email", text: data.text || data.fallback } }));
    } catch (e) {
      setAiBox((s) => ({
        ...s,
        [row.id]: { type: "email", text: e.response?.data?.fallback || e.response?.data?.error || "Failed" },
      }));
    }
  }

  async function genReminder(row) {
    try {
      const { data } = await api.post("/ai/generate-reminder", {
        clientName: row.client_name,
        renewalDate: row.renewal_date,
        policyNumber: "",
        tone: "Short, professional",
      });
      setAiBox((s) => ({ ...s, [row.id]: { type: "reminder", text: data.text || data.fallback } }));
    } catch (e) {
      setAiBox((s) => ({
        ...s,
        [row.id]: { type: "reminder", text: e.response?.data?.fallback || e.response?.data?.error || "Failed" },
      }));
    }
  }

  async function syncNotifs() {
    await api.post("/notifications/sync-renewals");
    alert("Renewal notifications refreshed for admins.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Renewals</h1>
          <p className="text-sm text-slate-500">Renewal pipeline, call logs, and reminders (assistants + admin).</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={syncNotifs}
            className="min-h-[44px] w-full shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 sm:w-auto"
          >
            Refresh renewal alerts
          </button>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <h2 className="font-semibold text-amber-900">Upcoming (next 90 days)</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
          {upcoming.map((r) => (
            <li key={r.id}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-current opacity-70" />
              {r.client_name} — {r.renewal_date} ({r.status})
              {r.renewal_traffic_light && (
                <span className="ml-2 text-xs font-semibold uppercase">· {r.renewal_traffic_light}</span>
              )}
            </li>
          ))}
          {upcoming.length === 0 && <li className="list-none">No upcoming renewals in this window.</li>}
        </ul>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:p-4">
        <select
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto sm:min-w-[11rem]"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option>Not Contacted</option>
          <option>Contacted</option>
          <option>Renewed</option>
          <option>Dropped</option>
        </select>
        <select
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto sm:min-w-[12rem]"
          value={filters.advisorId}
          onChange={(e) => setFilters({ ...filters, advisorId: e.target.value })}
        >
          <option value="">All advisors</option>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          type="date"
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
      </div>

      {canWrite && (
        <form onSubmit={add} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
          <h2 className="md:col-span-2 text-lg font-semibold">Add renewal record</h2>
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
            required
            type="date"
            className="rounded-lg border px-3 py-2 text-sm"
            value={form.renewal_date}
            onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
          />
          <select className="rounded-lg border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Not Contacted</option>
            <option>Contacted</option>
            <option>Renewed</option>
            <option>Dropped</option>
          </select>
          <input
            type="date"
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Reminder"
            value={form.reminder_date}
            onChange={(e) => setForm({ ...form, reminder_date: e.target.value })}
          />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Save
          </button>
        </form>
      )}

      <div className="table-scroll rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Advisor</th>
              <th className="px-4 py-3 font-medium">Renewal date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Reminder</th>
              <th className="px-4 py-3 font-medium">Call log</th>
              <th className="px-4 py-3 font-medium">AI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-slate-100 align-top ${urgencyBar(r.renewal_traffic_light)}`}>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.client_name}</div>
                  <div className="text-xs text-slate-500">{r.client_phone}</div>
                </td>
                <td className="px-4 py-3">{r.advisor_name || "—"}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-900">{r.renewal_date}</span>
                  {r.renewal_traffic_light && (
                    <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 ring-1 ring-slate-200">
                      {r.renewal_traffic_light}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canWrite ? (
                    <select className="rounded border px-2 py-1 text-xs" value={r.status} onChange={(e) => patch(r.id, { status: e.target.value })}>
                      <option>Not Contacted</option>
                      <option>Contacted</option>
                      <option>Renewed</option>
                      <option>Dropped</option>
                    </select>
                  ) : (
                    r.status
                  )}
                </td>
                <td className="px-4 py-3">
                  {canWrite ? (
                    <input
                      type="date"
                      className="rounded border px-2 py-1 text-xs"
                      defaultValue={r.reminder_date || ""}
                      onBlur={(e) => {
                        const v = e.target.value ? e.target.value : null;
                        const prev = r.reminder_date || null;
                        if (v !== prev) patch(r.id, { reminder_date: v });
                      }}
                    />
                  ) : (
                    r.reminder_date || "—"
                  )}
                </td>
                <td className="max-w-xs px-4 py-3">
                  <ul className="mb-2 space-y-1 text-xs text-slate-600">
                    {(r.call_logs || []).slice(-3).map((l, i) => (
                      <li key={i}>
                        {l.note} <span className="text-slate-400">({l.at?.slice?.(0, 10)})</span>
                      </li>
                    ))}
                  </ul>
                  {canWrite && (
                    <div className="flex gap-1">
                      <input
                        className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
                        placeholder="Call note"
                        value={callNote[r.id] || ""}
                        onChange={(e) => setCallNote({ ...callNote, [r.id]: e.target.value })}
                      />
                      <button type="button" className="rounded bg-slate-800 px-2 py-1 text-xs text-white" onClick={() => addLog(r.id)}>
                        Add
                      </button>
                    </div>
                  )}
                </td>
                <td className="max-w-[14rem] px-4 py-3 align-top">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="rounded-lg bg-blue-600 px-2 py-1 text-center text-xs font-semibold text-white hover:bg-blue-700"
                      onClick={() => genEmail(r)}
                    >
                      Generate email
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      onClick={() => genReminder(r)}
                    >
                      Send reminder
                    </button>
                  </div>
                  {aiBox[r.id] && (
                    <pre className="mt-2 max-h-28 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-[10px] leading-snug text-slate-800 whitespace-pre-wrap">
                      {aiBox[r.id].text}
                    </pre>
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
