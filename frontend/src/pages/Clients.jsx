import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));

export default function Clients() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [advisors, setAdvisors] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    advisor_id: "",
    policy_details: "",
    sum_insured: "",
    renewal_date: "",
  });

  async function load() {
    const { data } = await api.get("/clients", {
      params: {
        search,
        advisorId: advisorId || undefined,
        from: from || undefined,
        to: to || undefined,
        pageSize: 100,
      },
    });
    setItems(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    load().catch(() => {});
  }, [search, advisorId, from, to]);

  useEffect(() => {
    api.get("/advisors", { params: { pageSize: 500 } }).then((r) => setAdvisors(r.data.items || []));
  }, []);

  async function addClient(e) {
    e.preventDefault();
    await api.post("/clients", {
      ...form,
      advisor_id: form.advisor_id || null,
      sum_insured: form.sum_insured ? Number(form.sum_insured) : 0,
      renewal_date: form.renewal_date || null,
    });
    setForm({
      name: "",
      phone: "",
      email: "",
      advisor_id: "",
      policy_details: "",
      sum_insured: "",
      renewal_date: "",
    });
    load();
  }

  async function remove(id) {
    if (!confirm("Delete this client and related data?")) return;
    await api.delete(`/clients/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-500">{total} total · search and filters below</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:p-4">
        <input
          placeholder="Search name / phone / email"
          className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:min-w-[200px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto sm:min-w-[10rem]"
          value={advisorId}
          onChange={(e) => setAdvisorId(e.target.value)}
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
          className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="date"
          className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <form onSubmit={addClient} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-3">
        <h2 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-slate-800">Add client</h2>
        <input
          required
          placeholder="Name *"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          placeholder="Phone *"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          placeholder="Email"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.advisor_id}
          onChange={(e) => setForm({ ...form, advisor_id: e.target.value })}
        >
          <option value="">Advisor</option>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Sum insured"
          type="number"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.sum_insured}
          onChange={(e) => setForm({ ...form, sum_insured: e.target.value })}
        />
        <input
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.renewal_date}
          onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
        />
        <textarea
          placeholder="Policy details"
          className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm lg:col-span-3"
          rows={2}
          value={form.policy_details}
          onChange={(e) => setForm({ ...form, policy_details: e.target.value })}
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 md:col-span-2 lg:col-span-1">
          Save client
        </button>
      </form>

      <div className="table-scroll rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Advisor</th>
              <th className="px-4 py-3 font-medium">Sum insured</th>
              <th className="px-4 py-3 font-medium">Renewal</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-blue-700">
                  <Link to={`/clients/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">{c.advisor_name || "—"}</td>
                <td className="px-4 py-3">{inr(c.sum_insured)}</td>
                <td className="px-4 py-3">{c.renewal_date || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-rose-600 hover:underline" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
