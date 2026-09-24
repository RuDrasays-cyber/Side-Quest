import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import OAuthCallback from "@/pages/OAuthCallback";
import JobFeed from "@/pages/student/JobFeed";
import Applications from "@/pages/student/Applications";
import StudentProfile from "@/pages/student/StudentProfile";
import Profile from "@/pages/Profile";
import PostJob from "@/pages/company/PostJob";
import PostedJobs from "@/pages/company/PostedJobs";
import CandidateInbox from "@/pages/company/CandidateInbox";
import OrgProfile from "@/pages/company/OrgProfile";
import DomainManagement from "@/pages/university/DomainManagement";
import StudentVerification from "@/pages/university/StudentVerification";
import Analytics from "@/pages/university/Analytics";
import UniProfile from "@/pages/university/UniProfile";
import UserManagement from "@/pages/admin/UserManagement";
import GlobalSettings from "@/pages/admin/GlobalSettings";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminVerifications from "@/pages/admin/AdminVerifications";
import AdminReviews from "@/pages/admin/AdminReviews";
import ReviewPage from "@/pages/ReviewPage";
import About from "@/pages/About";
import UpdatePassword from "@/pages/UpdatePassword";
import ForgotPassword from "@/pages/ForgotPassword";
import BrowseOrgs from "@/pages/BrowseOrgs";
import PublicReviews from "@/pages/PublicReviews";
import MFASetup from "@/pages/MFASetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/reviews" element={<PublicReviews />} />
            <Route path="/mfa-setup" element={<MFASetup />} />

            {/* Student Routes */}
            <Route path="/dashboard/jobs" element={<ProtectedRoute allowedRoles={["student"]}><DashboardLayout><JobFeed /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/applications" element={<ProtectedRoute allowedRoles={["student"]}><DashboardLayout><Applications /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/student-profile" element={<ProtectedRoute allowedRoles={["student"]}><DashboardLayout><StudentProfile /></DashboardLayout></ProtectedRoute>} />

            {/* Company Routes */}
            <Route path="/dashboard/post-job" element={<ProtectedRoute allowedRoles={["company"]}><DashboardLayout><PostJob /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/my-jobs" element={<ProtectedRoute allowedRoles={["company"]}><DashboardLayout><PostedJobs /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/candidates" element={<ProtectedRoute allowedRoles={["company"]}><DashboardLayout><CandidateInbox /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/org-profile" element={<ProtectedRoute allowedRoles={["company"]}><DashboardLayout><OrgProfile /></DashboardLayout></ProtectedRoute>} />

            {/* University Routes */}
            <Route path="/dashboard/domains" element={<ProtectedRoute allowedRoles={["university_admin"]}><DashboardLayout><DomainManagement /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/verifications" element={<ProtectedRoute allowedRoles={["university_admin"]}><DashboardLayout><StudentVerification /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/analytics" element={<ProtectedRoute allowedRoles={["university_admin"]}><DashboardLayout><Analytics /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/uni-profile" element={<ProtectedRoute allowedRoles={["university_admin"]}><DashboardLayout><UniProfile /></DashboardLayout></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/dashboard/analytics-admin" element={<ProtectedRoute allowedRoles={["super_admin"]}><DashboardLayout><AdminAnalytics /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/users" element={<ProtectedRoute allowedRoles={["super_admin"]}><DashboardLayout><UserManagement /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/admin-verifications" element={<ProtectedRoute allowedRoles={["super_admin"]}><DashboardLayout><AdminVerifications /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/reviews" element={<ProtectedRoute allowedRoles={["super_admin"]}><DashboardLayout><AdminReviews /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute allowedRoles={["super_admin"]}><DashboardLayout><GlobalSettings /></DashboardLayout></ProtectedRoute>} />

            {/* UNIVERSAL ROUTES - Accessible to ALL authenticated users */}
            <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/review" element={<ProtectedRoute><DashboardLayout><ReviewPage /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/notifications" element={<ProtectedRoute><DashboardLayout><AdminNotifications /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/about" element={<ProtectedRoute><DashboardLayout><About /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/browse-orgs" element={<ProtectedRoute allowedRoles={["company", "university_admin"]}><DashboardLayout><BrowseOrgs /></DashboardLayout></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;