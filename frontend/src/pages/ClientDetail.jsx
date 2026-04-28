import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import api from "../api/client.js";
import { backendUrl } from "../lib/apiOrigin.js";
import GenerateEmail from "../components/GenerateEmail.jsx";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));

export default function ClientDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [advisors, setAdvisors] = useState([]);
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState(null);

  async function load() {
    const { data: d } = await api.get(`/clients/${id}/full`);
    setData(d);
    setEdit({
      name: d.client.name,
      phone: d.client.phone,
      email: d.client.email || "",
      advisor_id: d.client.advisor_id || "",
      policy_details: d.client.policy_details || "",
      sum_insured: d.client.sum_insured,
      renewal_date: d.client.renewal_date || "",
    });
  }

  useEffect(() => {
    load().catch(() => {});
    api.get("/advisors", { params: { pageSize: 500 } }).then((r) => setAdvisors(r.data.items || []));
  }, [id]);

  async function saveEdit(e) {
    e.preventDefault();
    await api.patch(`/clients/${id}`, {
      ...edit,
      advisor_id: edit.advisor_id || null,
      sum_insured: Number(edit.sum_insured || 0),
      renewal_date: edit.renewal_date || null,
    });
    load();
  }

  async function addNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    await api.post("/notes", { entity_type: "client", entity_id: id, content: note.trim() });
    setNote("");
    load();
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    await api.post(`/clients/${id}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    e.target.value = "";
    load();
  }

  if (!data || !edit) return <p className="text-slate-500">Loading…</p>;

  const c = data.client;
  const ctx = `Client: ${c.name}, Phone: ${c.phone}, Policy: ${c.policy_details || "n/a"}, Sum insured: ${inr(c.sum_insured)}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/clients" className="text-sm text-blue-600 hover:underline">
          ← Clients
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{c.name}</h1>
      </div>

      <form onSubmit={saveEdit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Client details</h2>
        <input className="rounded-lg border px-3 py-2 text-sm" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        <input className="rounded-lg border px-3 py-2 text-sm" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
        <input className="rounded-lg border px-3 py-2 text-sm" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={edit.advisor_id}
          onChange={(e) => setEdit({ ...edit, advisor_id: e.target.value })}
        >
          <option value="">No advisor</option>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="rounded-lg border px-3 py-2 text-sm"
          value={edit.sum_insured}
          onChange={(e) => setEdit({ ...edit, sum_insured: e.target.value })}
        />
        <input
          type="date"
          className="rounded-lg border px-3 py-2 text-sm"
          value={edit.renewal_date}
          onChange={(e) => setEdit({ ...edit, renewal_date: e.target.value })}
        />
        <textarea
          className="md:col-span-2 rounded-lg border px-3 py-2 text-sm"
          rows={3}
          value={edit.policy_details}
          onChange={(e) => setEdit({ ...edit, policy_details: e.target.value })}
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Save changes
        </button>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Upload document</label>
          <input type="file" className="mt-1 block w-full text-sm" onChange={onUpload} />
          <ul className="mt-2 text-sm text-slate-600">
            {data.documents.map((d) => (
              <li key={d.id}>
                <a className="text-blue-600 hover:underline" href={backendUrl(`/uploads/${d.file_path}`)} target="_blank" rel="noreferrer">
                  {d.original_name || d.file_path}
                </a>
              </li>
            ))}
            {data.documents.length === 0 && <li className="text-slate-400">No files yet</li>}
          </ul>
        </div>
      </form>

      <GenerateEmail purpose="Professional follow-up or backoffice query" context={ctx} />

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="text-lg font-semibold">Policies</h2>
        <div className="table-scroll -mx-1 mt-2 sm:mx-0">
          <table className="min-w-[480px] w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">Number</th>
              <th className="py-2">Status</th>
              <th className="py-2">Sum</th>
              <th className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.policies.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="py-2">{p.policy_number || "—"}</td>
                <td className="py-2">{p.status}</td>
                <td className="py-2">{inr(p.sum_insured)}</td>
                <td className="py-2 text-slate-600">{p.backoffice_query_notes || "—"}</td>
              </tr>
            ))}
            {data.policies.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-slate-500">
                  No policies
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="text-lg font-semibold">Renewals</h2>
        <div className="table-scroll -mx-1 mt-2 sm:mx-0">
          <table className="min-w-[400px] w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">Date</th>
              <th className="py-2">Status</th>
              <th className="py-2">Calls</th>
            </tr>
          </thead>
          <tbody>
            {data.renewals.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-2">{r.renewal_date}</td>
                <td className="py-2">{r.status}</td>
                <td className="py-2 text-slate-600">{(r.call_logs || []).length} log(s)</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="text-lg font-semibold">Claims</h2>
        <div className="table-scroll -mx-1 mt-2 sm:mx-0">
          <table className="min-w-[420px] w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">Status</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {data.claims.map((cl) => (
              <tr key={cl.id} className="border-t border-slate-100">
                <td className="py-2">{cl.status}</td>
                <td className="py-2">{inr(cl.amount)}</td>
                <td className="py-2 text-slate-600">{cl.description || "—"}</td>
              </tr>
            ))}
            {data.claims.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-slate-500">
                  No claims
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="text-lg font-semibold">Notes</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {data.notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">
                {format(new Date(n.created_at), "dd MMM yyyy HH:mm")} · {n.author_name || "User"}
              </div>
              <div className="mt-1 text-slate-800">{n.content}</div>
            </li>
          ))}
          {data.notes.length === 0 && <li className="text-slate-500">No notes yet</li>}
        </ul>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={addNote}>
          <input
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            placeholder="Add a note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
            Add note
          </button>
        </form>
      </div>
    </div>
  );
}
