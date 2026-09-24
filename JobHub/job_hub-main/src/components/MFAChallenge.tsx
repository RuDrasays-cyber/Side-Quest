import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";
import { getMFAFactors, mfaChallenge, mfaVerify } from "@/services/api";

interface MFAChallengeProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function MFAChallenge({ onSuccess, onCancel }: MFAChallengeProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFactor();
  }, []);

  const loadFactor = async () => {
    try {
      const factors = await getMFAFactors();
      const verified = factors.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
      } else {
        toast.error("No verified MFA factor found. Please set up MFA first.");
      }
    } catch (error: any) {
      toast.error("Failed to load MFA factors");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6 || !factorId) return;

    setVerifying(true);
    try {
      const challengeId = await mfaChallenge(factorId);
      await mfaVerify(factorId, challengeId, code);
      toast.success("Identity verified!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Invalid code. Please try again.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && factorId && !verifying) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, factorId, verifying]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <Card className="w-full max-w-md shadow-elevated border border-border bg-card">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30">
            <Shield className="h-7 w-7 text-blue-400" />
          </div>
          <CardTitle className="font-display text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
              autoFocus
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

          <Button
            onClick={handleVerify}
            className="w-full h-11"
            disabled={verifying || code.length !== 6}
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>

          {onCancel && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onCancel}
            >
              Cancel & Sign Out
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground/70">
            Open your authenticator app (Google Authenticator, Authy, etc.) and enter the current code for JobHub.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
