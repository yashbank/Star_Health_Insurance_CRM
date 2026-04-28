import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Users, FileText, IndianRupee, RefreshCw, AlertCircle, TrendingUp, Award } from "lucide-react";
import api from "../../api/client.js";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));

const CHART_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0d9488", "#4f46e5", "#ea580c"];

function StatCard({ title, value, icon: Icon, tone }) {
  const tones = {
    blue: "border-slate-200/80 bg-white text-slate-900 shadow-sm",
    emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-950 shadow-sm",
    amber: "border-amber-100 bg-amber-50/60 text-amber-950 shadow-sm",
    violet: "border-violet-100 bg-violet-50/50 text-violet-950 shadow-sm",
    rose: "border-rose-100 bg-rose-50/50 text-rose-950 shadow-sm",
    slate: "border-slate-200 bg-slate-50/80 text-slate-900 shadow-sm",
  };
  return (
    <div className={`rounded-2xl border p-5 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [desk, setDesk] = useState(null);
  const [activities, setActivities] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/stats"),
      api.get("/dashboard/analytics"),
      api.get("/dashboard/desk"),
      api.get("/dashboard/activities", { params: { limit: 25 } }),
      api.get("/dashboard/leaderboard"),
    ])
      .then(([s, a, d, act, lb]) => {
        setStats(s.data);
        setAnalytics(a.data);
        setDesk(d.data);
        setActivities(act.data);
        setLeaderboard(lb.data);
      })
      .catch((e) => setErr(e.response?.data?.error || "Could not load dashboard"));
  }, []);

  if (err) return <p className="text-sm text-rose-600">{err}</p>;
  if (!stats || !analytics || !desk) return <p className="text-sm text-slate-500">Loading executive view…</p>;

  const t = stats.totals;
  const conv = analytics.conversion || {};

  const monthKeys = new Set([
    ...(analytics.newPoliciesByMonth || []).map((r) => r.month),
    ...(analytics.renewalsTouchedByMonth || []).map((r) => r.month),
  ]);
  const mergedTrend = [...monthKeys]
    .sort()
    .map((m) => ({
      month: m,
      newPolicies: analytics.newPoliciesByMonth?.find((r) => r.month === m)?.cnt ?? 0,
      renewals: analytics.renewalsTouchedByMonth?.find((r) => r.month === m)?.cnt ?? 0,
    }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin overview</h1>
        <p className="mt-1 text-sm text-slate-500">Star Health desk — portfolio, renewals, and assistant performance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total policies" value={t.policies} icon={FileText} tone="violet" />
        <StatCard title="Total premium (booked)" value={inr(t.totalPremium ?? 0)} icon={IndianRupee} tone="emerald" />
        <StatCard title="High SI clients (≥ ₹5L)" value={analytics.highSumInsuredClients ?? 0} icon={Users} tone="blue" />
        <StatCard
          title="Conversion (active / clients)"
          value={`${conv.active_policies ?? 0} / ${conv.leads ?? 0}`}
          icon={TrendingUp}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clients" value={t.clients} icon={Users} tone="slate" />
        <StatCard title="Expiring policies (30d)" value={t.expiringPolicies30d ?? 0} icon={FileText} tone="amber" />
        <StatCard title="Renewals due (30d)" value={t.renewalsDue30d ?? 0} icon={RefreshCw} tone="rose" />
        <StatCard title="Claims pipeline" value={t.claims} icon={AlertCircle} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800">Alerts</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li className="flex justify-between gap-2">
              <span>Pending payments (policies)</span>
              <span className="font-semibold text-amber-700">{desk.policiesPendingPayment}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Renewal window (45d)</span>
              <span className="font-semibold text-amber-700">{desk.policiesRenewalWindow}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Claims in progress</span>
              <span className="font-semibold text-rose-700">{desk.claimsInProgress}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Renewals due (30d)</span>
              <span className="font-semibold text-slate-900">{desk.renewalsDue30d}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">Assistant leaderboard</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Assistant</th>
                  <th className="py-2 pr-4 font-medium">Policies owned</th>
                  <th className="py-2 font-medium">Claims on desk</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium text-slate-800">
                      {r.name}{" "}
                      <span className="text-xs font-normal text-slate-400">({r.role})</span>
                    </td>
                    <td className="py-2 pr-4">{r.policies_owned}</td>
                    <td className="py-2">{r.claims_on_desk}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-500">
                      No assistants found.
                  </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Policy mix</h2>
          <p className="text-xs text-slate-500">By policy type / product</p>
          <div className="mt-4 h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.policyMix || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72}>
                  {(analytics.policyMix || []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, "Policies"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">Premium by month</h2>
          <div className="mt-4 h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.premiumByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => inr(v)} />
                <Bar dataKey="premium" fill="#2563eb" radius={[6, 6, 0, 0]} name="Premium" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Renewals touched vs new policies</h2>
        <div className="mt-4 h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="newPolicies" name="New policies" stroke="#059669" strokeWidth={2} dot />
              <Line type="monotone" dataKey="renewals" name="Renewals touched" stroke="#d97706" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Award className="h-4 w-4 text-amber-500" />
            Upsell opportunities
          </h2>
          <p className="text-xs text-slate-500">Clients below ₹2L sum insured</p>
          <div className="mt-3 max-h-64 overflow-auto text-sm">
            {(stats.upsellOpportunities || []).map((r) => (
              <div key={r.id} className="flex justify-between border-b border-slate-100 py-2">
                <span className="font-medium text-slate-800">{r.name}</span>
                <span className="text-slate-600">{inr(r.sum_insured)}</span>
              </div>
            ))}
            {(!stats.upsellOpportunities || stats.upsellOpportunities.length === 0) && (
              <p className="py-4 text-slate-500">No matches.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Activity</h2>
          <div className="mt-3 max-h-64 overflow-auto text-sm">
            {activities.map((a) => (
              <div key={a.id} className="border-b border-slate-100 py-2">
                <div className="font-medium text-slate-800">{a.action}</div>
                <div className="text-xs text-slate-500">
                  {format(new Date(a.created_at), "dd MMM HH:mm")} · {a.user_name || "—"}{" "}
                  <span className="text-slate-400">({a.user_role})</span>
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="text-slate-500">No recent activity.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Open tasks</h2>
        <p className="mt-1 text-2xl font-bold text-slate-900">{t.openTasks}</p>
        <p className="text-xs text-slate-500">Assign work from the Tasks screen</p>
      </div>
    </div>
  );
}
