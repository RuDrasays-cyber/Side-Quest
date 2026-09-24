import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Building2, GraduationCap, ShieldAlert, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fetchAdminVerificationRequests, updateAdminVerificationStatus, runAdminAutoVerify, type AdminVerificationRequest } from "@/services/api";
import { useAutoRefreshPrompt } from "@/hooks/useAutoRefreshPrompt";

export default function AdminVerifications() {
  const [requests, setRequests] = useState<AdminVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoVerifyRunning, setIsAutoVerifyRunning] = useState(false);

  // Poll every 15 minutes to check for new requests
  useAutoRefreshPrompt(requests.length, fetchAdminVerificationRequests, "verification requests", 15);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await fetchAdminVerificationRequests();
      setRequests(data);
    } catch (error) {
      toast.error("Failed to fetch verification requests");
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const approvedRequests = requests.filter(r => r.status === "approved");

  const pendingCompanies = pendingRequests.filter(r => r.type === "company");
  const verifiedCompanies = approvedRequests.filter(r => r.type === "company");

  const pendingUniversities = pendingRequests.filter(r => r.type === "university");
  const verifiedUniversities = approvedRequests.filter(r => r.type === "university");

  const handleApprove = async (id: string, name: string) => {
    try {
      await updateAdminVerificationStatus(id, "approved");
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
      toast.success(`${name} has been approved and moved to active records.`);
    } catch {
      toast.error(`Failed to approve ${name}.`);
    }
  };

  const handleReject = async (id: string, name: string) => {
    try {
      await updateAdminVerificationStatus(id, "rejected");
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r));
      toast.error(`${name}'s application was rejected.`);
    } catch {
      toast.error(`Failed to reject ${name}.`);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    try {
      await updateAdminVerificationStatus(id, "pending");
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "pending" } : r));
      toast.info(`${name}'s verification was revoked and moved back to pending.`);
    } catch {
      toast.error(`Failed to revoke ${name}.`);
    }
  };

  const handleAutoVerify = async () => {
    setIsAutoVerifyRunning(true);
    try {
      await runAdminAutoVerify();
      await loadRequests();
      toast.success("Auto-verification complete. High-risk profiles require manual review.");
    } catch {
      toast.error("Failed to run auto-verification algorithm.");
    } finally {
      setIsAutoVerifyRunning(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display leading-none text-3xl font-bold tracking-tight mb-2">Authentication & Verification</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Review pending domain and organizational requests.
          </p>
        </div>
        <Button onClick={handleAutoVerify} disabled={isAutoVerifyRunning || pendingRequests.length === 0} className="bg-primary text-primary-foreground">
          {isAutoVerifyRunning ? (
            <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <ShieldAlert className="mr-2 h-4 w-4" />
          )}
          Run Auto-Verify Algorithm
        </Button>
      </div>

      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="mb-6 bg-card border border-border">
          <TabsTrigger value="companies">Companies ({pendingCompanies.length + verifiedCompanies.length})</TabsTrigger>
          <TabsTrigger value="universities">Universities ({pendingUniversities.length + verifiedUniversities.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="companies" className="space-y-8">
          {loading ? (
            <div className="p-12 flex justify-center border border-dashed border-border rounded-xl">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-primary">Pending Verification ({pendingCompanies.length})</h3>
                {pendingCompanies.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No pending company verification requests.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingCompanies.map(req => (
                      <RequestCard key={req.id} req={req} onApprove={handleApprove} onReject={handleReject} onRevoke={handleRevoke} icon={Building2} />
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border/50">
                <h3 className="text-xl font-semibold mb-4 text-foreground/80">Verified Companies ({verifiedCompanies.length})</h3>
                {verifiedCompanies.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                    <p>No verified companies found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                    {verifiedCompanies.map(req => (
                      <RequestCard key={req.id} req={req} onApprove={handleApprove} onReject={handleReject} onRevoke={handleRevoke} icon={Building2} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="universities" className="space-y-8">
          {loading ? (
            <div className="p-12 flex justify-center border border-dashed border-border rounded-xl">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-primary">Pending Verification ({pendingUniversities.length})</h3>
                {pendingUniversities.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No pending university verification requests.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingUniversities.map(req => (
                      <RequestCard key={req.id} req={req} onApprove={handleApprove} onReject={handleReject} onRevoke={handleRevoke} icon={GraduationCap} />
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border/50">
                <h3 className="text-xl font-semibold mb-4 text-foreground/80">Verified Universities ({verifiedUniversities.length})</h3>
                {verifiedUniversities.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                    <p>No verified universities found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                    {verifiedUniversities.map(req => (
                      <RequestCard key={req.id} req={req} onApprove={handleApprove} onReject={handleReject} onRevoke={handleRevoke} icon={GraduationCap} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RequestCard({ req, onApprove, onReject, onRevoke, icon: Icon }: { req: AdminVerificationRequest, onApprove: Function, onReject: Function, onRevoke: Function, icon: any }) {
  const isApproved = req.status === "approved";

  return (
    <Card className="border-border bg-card/60 backdrop-blur-md shadow-elevated flex flex-col group transition-all hover:border-primary/50 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <CardHeader className="pb-4 border-b border-white/5">
        <div className="flex justify-between items-start">
          <div className="p-2.5 rounded-xl bg-background border border-border shadow-inner">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <Badge variant={req.risk === "Low" ? "outline" : "destructive"} className={req.risk === "Low" ? "text-emerald-400 border-emerald-400/30 font-medium" : "font-bold shadow-[0_0_10px_hsl(var(--destructive)/0.5)]"}>
            {req.risk} Risk
          </Badge>
        </div>
        <CardTitle className="pt-4 text-xl tracking-tight">{req.name}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Check className="h-3 w-3 text-info" /> {req.domain}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 pb-0 flex-1">
        <div className="text-sm space-y-2 text-foreground/70">
          <div className="flex justify-between">
            <span>Contact</span>
            <span className="font-medium text-foreground">{req.email}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <Badge variant="outline" className={isApproved ? "text-emerald-500 border-emerald-500/20" : "text-amber-500 border-amber-500/20"}>
              {req.status}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-6 flex gap-3">
        {isApproved ? (
          <Button onClick={() => onRevoke(req.id, req.name)} className="flex-1 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20">
            <XCircle className="mr-2 h-4 w-4" /> Revoke
          </Button>
        ) : (
          <>
            <Button onClick={() => onApprove(req.id, req.name)} className="flex-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
            <Button onClick={() => onReject(req.id, req.name)} className="flex-1 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20">
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
