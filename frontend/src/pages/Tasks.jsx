import { useEffect, useState } from "react";
import { format } from "date-fns";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Tasks() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", due_date: "" });

  async function load() {
    const { data } = await api.get("/tasks", {
      params: {
        status: filter || undefined,
        assignee: user?.role !== "admin" ? user?.id : undefined,
      },
    });
    setRows(data);
  }

  useEffect(() => {
    load().catch(() => {});
  }, [filter, user?.id, user?.role]);

  useEffect(() => {
    if (user?.role === "admin") {
      api.get("/users").then((r) => setUsers(r.data));
    }
  }, [user?.role]);

  async function add(e) {
    e.preventDefault();
    await api.post("/tasks", {
      title: form.title,
      description: form.description,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
    });
    setForm({ title: "", description: "", assigned_to: "", due_date: "" });
    load();
  }

  async function patch(id, body) {
    await api.patch(`/tasks/${id}`, body);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
        <p className="text-sm text-slate-500">Assign work between admin and assistants.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <select
          className="min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm sm:w-auto sm:min-w-[12rem]"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <form onSubmit={add} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">New task</h2>
        <input
          required
          className="rounded-lg border px-3 py-2 text-sm"
          placeholder="Title *"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        {user?.role === "admin" && (
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={form.assigned_to}
            onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
          >
            <option value="">Assign to…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        )}
        <input
          type="date"
          className="rounded-lg border px-3 py-2 text-sm"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />
        <textarea
          className="md:col-span-2 rounded-lg border px-3 py-2 text-sm"
          rows={2}
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Create task
        </button>
      </form>

      <div className="table-scroll rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[560px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.description}</div>
                </td>
                <td className="px-4 py-3">{t.assignee_name || "—"}</td>
                <td className="px-4 py-3">{t.due_date ? format(new Date(t.due_date), "dd MMM yyyy") : "—"}</td>
                <td className="px-4 py-3">
                  <select className="rounded border px-2 py-1 text-xs" value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })}>
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
