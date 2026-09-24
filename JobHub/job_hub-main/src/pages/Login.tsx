import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LayoutDashboard, Loader2, Eye, EyeOff } from "lucide-react";
import { loginUser, registerUser, getUserProfile, signInWithGoogle, signInWithGitHub, signInWithLinkedIn, roleRequiresMFA, getMFAStatus } from "@/services/api";
import MFAChallenge from "@/components/MFAChallenge";
import Turnstile from "@/components/Turnstile";
import { supabase } from "@/services/api";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Determine the initial tab from the URL query parameter
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUniEmail, setRegUniEmail] = useState("");
  const [regPersonalEmail, setRegPersonalEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regRole, setRegRole] = useState("");
  const [candidateType, setCandidateType] = useState<"on_campus" | "off_campus" | "">("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);

  // Captcha state — shared between login and register
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaResetRef = useRef<(() => void) | null>(null);

  // MFA state
  const [showMFAChallenge, setShowMFAChallenge] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingToken, setPendingToken] = useState("");

  const isCandidate = regRole === "student";

  useEffect(() => {
    if (user) {
      const defaultRoutes: Record<string, string> = {
        student: "/dashboard/applications",
        company: "/dashboard/candidates",
        university_admin: "/dashboard/analytics",
        super_admin: "/dashboard/analytics-admin",
      };
      navigate(defaultRoutes[user.role] || "/dashboard/jobs");
    }
  }, [user, navigate]);

  // Helper: Complete login after MFA (or for roles that don't need MFA)
  const completeLogin = (loggedInUser: any, token: string) => {
    login(loggedInUser, token);
    toast.success("Logged in successfully!");
    const defaultRoutes: Record<string, string> = {
      student: "/dashboard/applications",
      company: "/dashboard/candidates",
      university_admin: "/dashboard/analytics",
      super_admin: "/dashboard/analytics-admin",
    };
    navigate(defaultRoutes[loggedInUser.role] || "/dashboard/jobs");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authData = await loginUser(loginEmail, loginPassword, captchaToken || undefined);
      
      const profileData = await getUserProfile();

      const loggedInUser = {
        id: authData.user.id,
        name: profileData.name,
        email: authData.user.email as string,
        role: profileData.role,
      };

      // Check if this role requires MFA
      if (roleRequiresMFA(profileData.role)) {
        const mfaStatus = await getMFAStatus();

        if (!mfaStatus.isEnrolled) {
          // First time: redirect to MFA setup
          login(loggedInUser, authData.session.access_token);
          toast.info(`Your role as ${profileData.role.replace('_', ' ')} requires Multi-Factor Authentication. Let's set it up.`);
          navigate("/mfa-setup");
          return;
        }

        if (!mfaStatus.isVerified) {
          // Enrolled but not verified this session: show challenge
          setPendingUser(loggedInUser);
          setPendingToken(authData.session.access_token);
          setShowMFAChallenge(true);
          return;
        }

        // Already aal2: proceed normally
      }

      completeLogin(loggedInUser, authData.session.access_token);

    } catch (error: any) {
      // Reset captcha on failure so user can retry
      captchaResetRef.current?.();

      if (error.message.includes("Email not confirmed")) {
        toast.error("Please verify your email address before logging in.");
      } else if (error.message.toLowerCase().includes("captcha")) {
        toast.error("Captcha verification failed. Please complete the challenge and try again.");
      } else {
        toast.error(error.message || "Invalid login credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // MFA challenge success handler
  const handleMFASuccess = async () => {
    if (pendingUser && pendingToken) {
      // Refresh session to get the updated aal2 token
      const { data } = await supabase.auth.getSession();
      const newToken = data.session?.access_token || pendingToken;
      completeLogin(pendingUser, newToken);
    }
  };

  const handleMFACancel = async () => {
    setShowMFAChallenge(false);
    setPendingUser(null);
    setPendingToken("");
    await supabase.auth.signOut();
    toast.info("Signed out.");
  };

  // If MFA challenge is active, show it instead of the login form
  if (showMFAChallenge) {
    return <MFAChallenge onSuccess={handleMFASuccess} onCancel={handleMFACancel} />;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (regPassword !== regConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    // Build the full name depending on role
    const fullName = isCandidate
      ? `${regFirstName.trim()} ${regLastName.trim()}`
      : regName.trim();

    if (!regRole || !fullName) {
      toast.error("Please select an Account Type and fill in your name.", {
        className: "bg-background text-foreground border border-border rounded-xl shadow-lg font-medium",
      });
      return;
    }

    if (isCandidate && !candidateType) {
      toast.error("Please select the placement type.", {
        className: "bg-background text-foreground border border-border rounded-xl shadow-lg font-medium",
      });
      return;
    }

    setLoading(true);
    try {
      // For students on campus, primary auth is UniEmail, backup is regEmail
      // For others, primary auth is regEmail, backup is regPersonalEmail
      const primaryEmail = isCandidate && candidateType === "on_campus" && regUniEmail
        ? regUniEmail
        : regEmail;
        
      const backupEmail = isCandidate && candidateType === "on_campus" 
        ? regEmail 
        : (isCandidate ? undefined : regPersonalEmail);

      await registerUser(primaryEmail, regPassword, fullName, regRole, backupEmail, captchaToken || undefined);
      toast.success("Registration successful! Please check your email to verify your account.");
      setLoginEmail(primaryEmail);
    } catch (error: any) {
      // Reset captcha on failure
      captchaResetRef.current?.();

      if (error.message.toLowerCase().includes("captcha")) {
        toast.error("Captcha verification failed. Please complete the challenge and try again.");
      } else {
        toast.error(error.message || "Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <LayoutDashboard className="h-10 w-10 text-primary-foreground" />
          <h1 className="font-display text-4xl font-bold text-primary-foreground">JobHub</h1>
        </div>
        
        <Card className="shadow-elevated border border-border bg-card text-card-foreground transition-none">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={initialTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              {/* =================== LOGIN TAB =================== */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showLoginPassword ? "text" : "password"} 
                        placeholder={showLoginPassword ? "Enter password" : "••••••••"}
                        value={loginPassword} 
                        onChange={(e) => setLoginPassword(e.target.value)} 
                        required 
                        className="pr-10" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        title={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Turnstile Captcha */}
                  <Turnstile onToken={setCaptchaToken} resetRef={captchaResetRef} />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                {/* OAuth Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
                </div>

                {/* OAuth Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" type="button" className="h-11 border-white/10 hover:bg-white/5" onClick={() => signInWithGoogle()}>
                    <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </Button>
                  <Button variant="outline" type="button" className="h-11 border-white/10 hover:bg-white/5" onClick={() => signInWithGitHub()}>
                    <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    GitHub
                  </Button>
                  <Button variant="outline" type="button" className="h-11 border-white/10 hover:bg-white/5" onClick={() => signInWithLinkedIn()}>
                    <svg className="h-4 w-4 mr-1.5" fill="#0A66C2" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </Button>
                </div>
              </TabsContent>

              {/* =================== REGISTER TAB =================== */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">

                  {/* Account Type select — placed at top so conditional fields appear below */}
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select value={regRole} onValueChange={(val) => { setRegRole(val); setCandidateType(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select Account Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Candidate</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="university_admin">University / Placement Cell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Candidate sub-type (On Campus / Off Campus) */}
                  {isCandidate && (
                    <div className="space-y-2">
                      <Label>Placement Type</Label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setCandidateType("on_campus")}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${
                            candidateType === "on_campus"
                              ? "bg-primary text-primary-foreground border-primary shadow-md"
                              : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          On Campus
                        </button>
                        <button
                          type="button"
                          onClick={() => setCandidateType("off_campus")}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${
                            candidateType === "off_campus"
                              ? "bg-primary text-primary-foreground border-primary shadow-md"
                              : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          Off Campus
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Name fields */}
                  {regRole && (
                    isCandidate ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="reg-firstname">First Name</Label>
                          <Input id="reg-firstname" placeholder="John" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-lastname">Last Name</Label>
                          <Input id="reg-lastname" placeholder="Doe" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} required />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="reg-name">Name</Label>
                        <Input id="reg-name" placeholder={regRole === "company" ? "Acme Corp" : "MIT Placement Cell"} value={regName} onChange={(e) => setRegName(e.target.value)} required />
                      </div>
                    )
                  )}

                  {/* Email fields */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">
                      {isCandidate 
                        ? (candidateType === "on_campus" ? "Personal Email" : "Email") 
                        : (regRole === "company" ? "Company Domain Email" : (regRole === "university_admin" ? "University Domain Email" : "Email"))}
                    </Label>
                    <Input id="reg-email" type="email" placeholder="you@domain.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  </div>
                  
                  {isCandidate && candidateType === "on_campus" && (
                    <div className="space-y-2">
                      <Label htmlFor="reg-uni-email">University Email</Label>
                      <Input id="reg-uni-email" type="email" placeholder="you@university.edu" value={regUniEmail} onChange={(e) => setRegUniEmail(e.target.value)} required />
                    </div>
                  )}

                  {!isCandidate && regRole !== "" && (
                    <div className="space-y-2">
                      <Label htmlFor="reg-personal-email">Personal Email (Optional for Backup)</Label>
                      <Input id="reg-personal-email" type="email" placeholder="you@gmail.com" value={regPersonalEmail} onChange={(e) => setRegPersonalEmail(e.target.value)} />
                    </div>
                  )}

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password (Min 6 chars)</Label>
                    <div className="relative">
                      <Input 
                        id="reg-password" 
                        type={showRegPassword ? "text" : "password"} 
                        placeholder={showRegPassword ? "Enter password" : "••••••••"}
                        value={regPassword} 
                        onChange={(e) => setRegPassword(e.target.value)} 
                        required 
                        minLength={6} 
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        title={showRegPassword ? "Hide password" : "Show password"}
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input 
                        id="reg-confirm-password" 
                        type={showRegConfirmPassword ? "text" : "password"} 
                        placeholder={showRegConfirmPassword ? "Re-enter password" : "••••••••"}
                        value={regConfirmPassword} 
                        onChange={(e) => setRegConfirmPassword(e.target.value)} 
                        required 
                        minLength={6} 
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        title={showRegConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Turnstile Captcha */}
                  <Turnstile onToken={setCaptchaToken} resetRef={captchaResetRef} />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? "Registering..." : "Create Account"}
                  </Button>
                </form>

                {/* OAuth Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or register with</span></div>
                </div>

                {/* OAuth Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" type="button" className="h-11 border-white/10 hover:bg-white/5" onClick={() => signInWithGoogle()}>
                    <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </Button>
                  <Button variant="outline" type="button" className="h-11 border-white/10 hover:bg-white/5" onClick={() => signInWithGitHub()}>
                    <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    GitHub
                  </Button>
                  <Button variant="outline" type="button" className="h-11 border-white/10 hover:bg-white/5" onClick={() => signInWithLinkedIn()}>
                    <svg className="h-4 w-4 mr-1.5" fill="#0A66C2" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}