import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, CreditCard, AlertCircle, RefreshCw, PlusCircle } from "lucide-react";
import api from "../../api/client.js";

export default function AssistantDashboard() {
  const [desk, setDesk] = useState(null);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([api.get("/dashboard/desk"), api.get("/dashboard/stats")])
      .then(([d, s]) => {
        setDesk(d.data);
        setStats(s.data);
      })
      .catch((e) => setErr(e.response?.data?.error || "Could not load desk"));
  }, []);

  if (err) return <p className="text-sm text-rose-600">{err}</p>;
  if (!desk || !stats) return <p className="text-sm text-slate-500">Loading your desk…</p>;

  const t = stats.totals;

  const quick = [
    { to: "/policies", label: "Add / view policies", icon: FileText },
    { to: "/claims", label: "Update claims", icon: AlertCircle },
    { to: "/renewals", label: "Renewals", icon: RefreshCw },
    { to: "/clients", label: "Clients", icon: PlusCircle },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Your desk</h1>
        <p className="mt-1 text-sm text-slate-500">Policies assigned to you, payments, claims, and renewals</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policies to process</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{t.policies}</p>
          <p className="mt-1 text-xs text-slate-500">Assigned policies in your queue</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Pending payments</p>
          <p className="mt-2 text-3xl font-bold text-amber-950">{desk.policiesPendingPayment}</p>
          <p className="mt-1 text-xs text-amber-900/80">Status = Pending Payment</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Claims in progress</p>
          <p className="mt-2 text-3xl font-bold text-rose-950">{desk.claimsInProgress}</p>
          <p className="mt-1 text-xs text-rose-900/80">Filed or under review</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Renewals due (30d)</p>
          <p className="mt-2 text-3xl font-bold text-emerald-950">{desk.renewalsDue30d}</p>
          <p className="mt-1 text-xs text-emerald-900/80">All clients (coordination)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quick.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="flex min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-blue-200 hover:bg-white"
            >
              <q.icon className="h-5 w-5 text-blue-600" />
              {q.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Operational snapshot</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-slate-500">Open tasks</dt>
            <dd className="text-lg font-semibold text-slate-900">{t.openTasks}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Renewal window (45d)</dt>
            <dd className="text-lg font-semibold text-slate-900">{desk.policiesRenewalWindow}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Clients (read-only count)</dt>
            <dd className="text-lg font-semibold text-slate-900">{t.clients}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Financial summaries and exports are limited to the admin account. Use policies and claims screens for day-to-day
          updates.
        </p>
      </div>
    </div>
  );
}
