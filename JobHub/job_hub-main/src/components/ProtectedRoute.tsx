import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/services/api";

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const defaultRoutes: Record<string, string> = {
      student: "/dashboard/jobs",
      company: "/dashboard/post-job",
      university: "/dashboard/domains",
      admin: "/dashboard/analytics-admin",
    };
    return <Navigate to={defaultRoutes[user.role] || "/dashboard/jobs"} replace />;
  }

  return <>{children}</>;
}
