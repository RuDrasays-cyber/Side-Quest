import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Shield, Loader2, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { mfaEnroll, mfaChallenge, mfaVerify } from "@/services/api";
import { supabase } from "@/services/api";
import { QRCodeSVG } from "qrcode.react";

export default function MFASetup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [qrUri, setQrUri] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    enrollMFA(user.role);
  }, [user, navigate]);

  const enrollMFA = async (role: string) => {
    try {
      setLoading(true);
      const result = await mfaEnroll(role);
      setFactorId(result.factorId);
      setQrUri(result.qrCodeUri);
      setQrSvg(result.qrCodeSvg);
      setSecret(result.secret);
    } catch (error: any) {
      toast.error(error.message || "Failed to initialize MFA setup");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setVerifying(true);
    try {
      const challengeId = await mfaChallenge(factorId);
      await mfaVerify(factorId, challengeId, code);
      toast.success("MFA enabled successfully! Your account is now protected.");

      // Log the generation of MFA natively to the notifications timeline
      await supabase.rpc('rpc_log_mfa_notification');

      // Auto-create companies row for company users right after MFA
      if (user?.role === 'company') {
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (!existingCompany) {
          // Get the org name from profiles
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();

          const companyName = profileData?.name || user.name || 'My Company';

          // Try RPC first, then direct insert
          const { error: rpcErr } = await supabase.rpc('secure_create_company', {
            p_profile_id: user.id,
            p_name: companyName
          });

          if (rpcErr) {
            // Fallback: direct insert
            await supabase.from('companies').insert({
              profile_id: user.id,
              name: companyName,
              is_verified_by_admin: false,
            });
          }
        }
      }

      const defaultRoutes: Record<string, string> = {
        super_admin: "/dashboard/analytics-admin",
        company: "/dashboard/candidates",
        university_admin: "/dashboard/analytics",
      };
      navigate(defaultRoutes[user?.role || ""] || "/dashboard/jobs");
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code. Please try again.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    toast.success("Secret key copied to clipboard");
    setTimeout(() => setSecretCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <Card className="w-full max-w-lg shadow-elevated border border-border bg-card">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/30">
            <Shield className="h-8 w-8 text-emerald-400" />
          </div>
          <CardTitle className="font-display text-2xl">Secure Your Account</CardTitle>
          <CardDescription className="text-base text-balance mx-auto">
            Your role as <span className="font-semibold text-primary">{user?.role?.replace('_', ' ')}</span> requires Multi-Factor Authentication.
            <br />
            Scan the QR code below with your authenticator app.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: QR Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
              Scan this QR code with Google Authenticator, Authy, or any TOTP app
            </div>
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl shadow-md">
                {qrSvg ? (
                  <img src={qrSvg} className="w-[200px] h-[200px] object-contain" alt="MFA QR Code" />
                ) : (
                  <QRCodeSVG
                    value={qrUri || "otpauth://dummy"}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Manual Secret Key */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              Can't scan? Enter this key manually:
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted/50 rounded-lg text-xs font-mono tracking-wider break-all border border-border">
                {secret}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copySecret}
                className="shrink-0 h-9 gap-1.5"
              >
                {secretCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {secretCopied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Step 2: Verify Code */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
              Enter the 6-digit code from your app
            </div>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            onClick={handleVerify}
            className="w-full h-12 text-base font-semibold"
            disabled={verifying || code.length !== 6}
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Activate MFA
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground/70">
            Once activated, you'll need this code every time you log in.
            <br />
            Keep your authenticator app safe — it's your second key.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
