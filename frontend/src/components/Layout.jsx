import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckSquare,
  Bell,
  Menu,
  X,
  LogOut,
  Search,
  FileDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, roles: ["admin", "assistant1", "assistant2"] },
  { to: "/clients", label: "Clients", icon: Users, roles: ["admin", "assistant1", "assistant2"] },
  { to: "/advisors", label: "Advisors", icon: UserCircle, roles: ["admin"] },
  { to: "/policies", label: "Policies", icon: FileText, roles: ["admin", "assistant1", "assistant2"] },
  { to: "/renewals", label: "Renewals", icon: RefreshCw, roles: ["admin", "assistant1", "assistant2"] },
  { to: "/claims", label: "Claims", icon: AlertCircle, roles: ["admin", "assistant1", "assistant2"] },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, roles: ["admin", "assistant1", "assistant2"] },
  { to: "/reports", label: "Exports", icon: FileDown, roles: ["admin"] },
];

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [payload, setPayload] = useState({ clients: [], policies: [], members: [], claims: [] });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancel = false;
    if (q.trim().length < 2) {
      setPayload({ clients: [], policies: [], members: [], claims: [] });
      return;
    }
    const t = setTimeout(() => {
      api.get("/search", { params: { q } }).then((r) => {
        if (!cancel) {
          setPayload({
            clients: r.data.clients || [],
            policies: r.data.policies || [],
            members: r.data.members || [],
            claims: r.data.claims || [],
          });
        }
      });
    }, 200);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  const total = payload.clients.length + payload.policies.length + payload.members.length + payload.claims.length;

  return (
    <div className="relative w-full min-w-0 max-w-full sm:max-w-xl sm:flex-1">
      <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          placeholder="Search clients, policies, members, claims…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 max-h-[min(28rem,70vh)] w-full max-w-[calc(100vw-1.5rem)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl sm:max-w-none sm:min-w-[20rem]">
          {total === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">No matches</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {payload.clients.length > 0 && (
                <div className="p-2">
                  <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Clients</p>
                  {payload.clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        navigate(`/clients/${c.id}`);
                      }}
                    >
                      <div className="font-medium text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
              {payload.policies.length > 0 && (
                <div className="p-2">
                  <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Policies</p>
                  {payload.policies.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        navigate(`/policies/${p.id}`);
                      }}
                    >
                      <div className="font-medium text-slate-800">{p.policy_number || "Policy"}</div>
                      <div className="text-xs text-slate-500">
                        {p.client_name} · {p.product_name || p.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {payload.members.length > 0 && (
                <div className="p-2">
                  <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Members</p>
                  {payload.members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        navigate(`/policies/${m.policy_id}`);
                      }}
                    >
                      <div className="font-medium text-slate-800">{m.name}</div>
                      <div className="text-xs text-slate-500">
                        {m.relation} · {m.policy_number} · {m.client_name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {payload.claims.length > 0 && (
                <div className="p-2">
                  <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Claims</p>
                  {payload.claims.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        navigate("/claims");
                      }}
                    >
                      <div className="font-medium text-slate-800">{c.claim_number || "Claim"}</div>
                      <div className="text-xs text-slate-500">
                        {c.client_name} · {c.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    api
      .get("/notifications")
      .then((r) => setNotifs(r.data))
      .catch(() => {});
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  const filteredNav = nav.filter((n) => n.roles.includes(user?.role));

  const linkClass = ({ isActive }) =>
    `flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-900/45 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[min(18rem,100vw-2rem)] max-w-[85vw] flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-xl transition-transform lg:static lg:min-h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4">
          <span className="text-lg font-semibold tracking-tight text-white">Star Health Insurance CRM</span>
          <button
            type="button"
            className="ml-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="h-4 w-4 shrink-0 opacity-90" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 bg-slate-950/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs text-slate-400 lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:mt-0">
          Signed in as <span className="font-medium text-slate-100">{user?.name}</span>
          <div className="mt-0.5 capitalize text-slate-500">
            {user?.role === "admin"
              ? "Admin"
              : user?.role === "assistant1"
                ? "Assistant 1"
                : user?.role === "assistant2"
                  ? "Assistant 2"
                  : user?.role}
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-20 flex flex-col gap-2 border-b border-slate-200/90 bg-white/90 px-3 py-2.5 shadow-sm shadow-slate-200/50 backdrop-blur-md sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-slate-200 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <GlobalSearch />
          </div>
          <div className="relative flex shrink-0 items-center justify-end gap-2 sm:ml-auto">
            <div className="relative">
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-slate-100"
                title="Notifications"
                aria-label="Notifications"
                onClick={() => setNotifOpen((o) => !o)}
              >
                <Bell className="h-5 w-5 text-slate-600" />
                {unread > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 translate-x-0.5 -translate-y-0.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                  {notifs.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-500">No notifications</p>
                  ) : (
                    notifs.slice(0, 20).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${n.read ? "text-slate-500" : "font-medium text-slate-900"}`}
                        onClick={async () => {
                          if (!n.read) {
                            await api.patch(`/notifications/${n.id}/read`);
                            setNotifs((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                          }
                        }}
                      >
                        {n.message}
                        <div className="text-xs font-normal text-slate-400">{new Date(n.created_at).toLocaleString()}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
