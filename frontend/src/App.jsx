import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Clients = lazy(() => import("./pages/Clients.jsx"));
const ClientDetail = lazy(() => import("./pages/ClientDetail.jsx"));
const Advisors = lazy(() => import("./pages/Advisors.jsx"));
const Policies = lazy(() => import("./pages/Policies.jsx"));
const PolicyDetail = lazy(() => import("./pages/PolicyDetail.jsx"));
const Renewals = lazy(() => import("./pages/Renewals.jsx"));
const Claims = lazy(() => import("./pages/Claims.jsx"));
const Tasks = lazy(() => import("./pages/Tasks.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      <p className="text-sm">Loading…</p>
    </div>
  );
}

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        <p className="text-sm">Restoring session…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        <p className="text-sm">Restoring session…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="clients"
          element={
            <Suspense fallback={<PageFallback />}>
              <Clients />
            </Suspense>
          }
        />
        <Route
          path="clients/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <ClientDetail />
            </Suspense>
          }
        />
        <Route
          path="advisors"
          element={
            <Suspense fallback={<PageFallback />}>
              <Advisors />
            </Suspense>
          }
        />
        <Route
          path="policies"
          element={
            <Suspense fallback={<PageFallback />}>
              <Policies />
            </Suspense>
          }
        />
        <Route
          path="policies/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <PolicyDetail />
            </Suspense>
          }
        />
        <Route
          path="renewals"
          element={
            <Suspense fallback={<PageFallback />}>
              <Renewals />
            </Suspense>
          }
        />
        <Route
          path="claims"
          element={
            <Suspense fallback={<PageFallback />}>
              <Claims />
            </Suspense>
          }
        />
        <Route
          path="tasks"
          element={
            <Suspense fallback={<PageFallback />}>
              <Tasks />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<PageFallback />}>
              <AdminOnly>
                <Reports />
              </AdminOnly>
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
