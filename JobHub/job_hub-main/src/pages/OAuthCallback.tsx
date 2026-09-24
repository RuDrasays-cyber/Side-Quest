import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { supabase, getUserProfile, completeOAuthProfile, roleRequiresMFA, getMFAStatus } from "@/services/api";
import type { UserRole } from "@/services/api";
import MFAChallenge from "@/components/MFAChallenge";

export default function OAuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [needsRole, setNeedsRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isLinkedIn, setIsLinkedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orgName, setOrgName] = useState("");

  // MFA state
  const [showMFAChallenge, setShowMFAChallenge] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingToken, setPendingToken] = useState("");

  // Helper: route user to their dashboard
  const getDashboardRoute = (role: string): string => {
    const routes: Record<string, string> = {
      student: "/dashboard/applications",
      company: "/dashboard/candidates",
      university_admin: "/dashboard/analytics",
      super_admin: "/dashboard/analytics-admin",
    };
    return routes[role] || "/dashboard/jobs";
  };

  // Helper: Complete login, handling MFA if required
  const completeLoginWithMFA = async (
    loggedInUser: { id: string; name: string; email: string; role: UserRole },
    token: string,
    isNewUser: boolean
  ) => {
    // Check if this role requires MFA
    if (roleRequiresMFA(loggedInUser.role)) {
      const mfaStatus = await getMFAStatus();

      if (!mfaStatus.isEnrolled) {
        // First time: redirect to MFA setup
        login(loggedInUser, token);
        toast.info(`Your role as ${loggedInUser.role.replace('_', ' ')} requires Multi-Factor Authentication. Let's set it up.`);
        navigate("/mfa-setup");
        return;
      }

      if (!mfaStatus.isVerified) {
        // Enrolled but not verified this session: show challenge
        setPendingUser(loggedInUser);
        setPendingToken(token);
        setShowMFAChallenge(true);
        return;
      }

      // Already aal2: proceed normally
    }

    login(loggedInUser, token);
    toast.success(isNewUser ? "Profile created successfully!" : "Welcome back!");
    navigate(getDashboardRoute(loggedInUser.role));
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          toast.error("Authentication failed. Please try again.");
          navigate("/login");
          return;
        }

        // Check provider
        const provider = session.user.app_metadata?.provider || "";
        setIsLinkedIn(provider === "linkedin_oidc");

        // Check if profile already exists (returning user)
        try {
          const profileData = await getUserProfile();
          if (profileData?.role) {
            // Existing user — handle MFA then go to dashboard
            const loggedInUser = {
              id: session.user.id,
              name: profileData.name,
              email: session.user.email as string,
              role: profileData.role as UserRole,
            };
            await completeLoginWithMFA(loggedInUser, session.access_token, false);
            return;
          }
        } catch {
          // getUserProfile() failed — either no profile or MFA RESTRICTIVE blocked it.
          // For email signups, the trigger already created the profile and we have
          // role/name in user_metadata. Use that to proceed:
          if (provider === "email") {
            const role = session.user.user_metadata?.role || "student";
            const name = session.user.user_metadata?.name
              || session.user.email?.split("@")[0]
              || "User";
            const loggedInUser = {
              id: session.user.id,
              name,
              email: session.user.email as string,
              role: role as UserRole,
            };
            await completeLoginWithMFA(loggedInUser, session.access_token, false);
            return;
          }
          // For OAuth users — profile doesn't exist yet, show role selection
        }

        setNeedsRole(true);
      } catch {
        toast.error("Something went wrong during authentication.");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    handleCallback();
  }, []);

  const handleCompleteProfile = async () => {
    if (!selectedRole) {
      toast.error("Please select your account type.");
      return;
    }
    setSubmitting(true);
    try {
      await completeOAuthProfile(selectedRole, isLinkedIn ? linkedinUrl : undefined, orgName || undefined);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      // Build user object directly from session data — do NOT re-read
      // through getUserProfile() because the MFA RESTRICTIVE policy
      // blocks reads for privileged roles before MFA is set up.
      const loggedInUser = {
        id: session.user.id,
        name: session.user.user_metadata?.full_name
          || session.user.user_metadata?.name
          || session.user.email?.split('@')[0]
          || "User",
        email: session.user.email as string,
        role: selectedRole as UserRole,
      };

      await completeLoginWithMFA(loggedInUser, session.access_token, true);
    } catch (err: any) {
      toast.error(err.message || "Failed to complete profile.");
    } finally {
      setSubmitting(false);
    }
  };

  // MFA challenge success handler
  const handleMFASuccess = async () => {
    if (pendingUser && pendingToken) {
      const { data } = await supabase.auth.getSession();
      const newToken = data.session?.access_token || pendingToken;
      login(pendingUser, newToken);
      toast.success("Welcome back!");
      navigate(getDashboardRoute(pendingUser.role));
    }
  };

  const handleMFACancel = async () => {
    setShowMFAChallenge(false);
    setPendingUser(null);
    setPendingToken("");
    await supabase.auth.signOut();
    toast.info("Signed out.");
    navigate("/login");
  };

  // Show MFA challenge if needed
  if (showMFAChallenge) {
    return <MFAChallenge onSuccess={handleMFASuccess} onCancel={handleMFACancel} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-foreground/80 font-medium animate-pulse">Completing sign-in...</p>
        </div>
      </div>
    );
  }

  if (!needsRole) return null;

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <Card className="w-full max-w-md border-border bg-card/60 backdrop-blur-xl shadow-elevated">
        <CardHeader className="text-center border-b border-white/5 pb-6">
          <div className="mx-auto mb-3 p-3 rounded-2xl bg-primary/15 border border-primary/20 w-fit">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Almost There!</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Set up your JobHub profile to continue</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue placeholder="Select your role..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">🎓 Student / Candidate</SelectItem>
                <SelectItem value="company">🏢 Company / Recruiter</SelectItem>
                <SelectItem value="university_admin">🏫 University Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLinkedIn && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-[#0A66C2]" /> LinkedIn Profile URL
              </Label>
              <Input
                placeholder="https://linkedin.com/in/yourname"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optional — displayed on your public profile</p>
            </div>
          )}

          {(selectedRole === "company" || selectedRole === "university_admin") && (
            <div className="space-y-2">
              <Label>Organization Name *</Label>
              <Input
                placeholder={selectedRole === "company" ? "Enter Company Name" : "Enter University Name"}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">This guarantees your actual organization name is recorded seamlessly during approval mapping.</p>
            </div>
          )}

          <Button
            onClick={handleCompleteProfile}
            disabled={!selectedRole || submitting || ((selectedRole === "company" || selectedRole === "university_admin") && !orgName.trim())}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
          >
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</> : "Complete Setup"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
