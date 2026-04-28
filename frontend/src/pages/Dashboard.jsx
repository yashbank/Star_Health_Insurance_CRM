import { useAuth } from "../context/AuthContext.jsx";
import AdminDashboard from "../features/dashboard/AdminDashboard.jsx";
import AssistantDashboard from "../features/dashboard/AssistantDashboard.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "admin") return <AdminDashboard />;
  return <AssistantDashboard />;
}
