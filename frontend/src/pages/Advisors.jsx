import { useEffect, useState } from "react";
import api from "../api/client.js";

export default function Advisors() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  async function load() {
    const { data } = await api.get("/advisors", { params: { search, pageSize: 100 } });
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, [search]);

  async function add(e) {
    e.preventDefault();
    await api.post("/advisors", form);
    setForm({ name: "", phone: "", email: "" });
    load();
  }

  async function remove(id) {
    if (!confirm("Remove advisor?")) return;
    await api.delete(`/advisors/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Advisors</h1>
        <p className="text-sm text-slate-500">Manage your advisor network and assignments from client records.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <input
          placeholder="Search advisors"
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <form onSubmit={add} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:p-4">
        <input
          required
          placeholder="Name"
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto sm:min-w-[10rem]"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Phone"
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto sm:min-w-[10rem]"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          placeholder="Email"
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:min-w-[12rem] sm:flex-1"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <button type="submit" className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white sm:self-center">
          Add advisor
        </button>
      </form>

      <div className="table-scroll rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[520px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Clients</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3">{a.phone || "—"}</td>
                <td className="px-4 py-3">{a.email || "—"}</td>
                <td className="px-4 py-3">{a.client_count}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-rose-600 hover:underline" onClick={() => remove(a.id)}>
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
