import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, UserCheck, XCircle, Loader2, Inbox } from "lucide-react";
import { fetchApplications, Application } from "@/services/api";
import { toast } from "sonner";
import { useAutoRefreshPrompt } from "@/hooks/useAutoRefreshPrompt";

const statusConfig: Record<string, { label: string, icon: any, color: string }> = {
  Applied: { label: "Applied", icon: Clock, color: "bg-info text-info-foreground" },
  applied: { label: "Applied", icon: Clock, color: "bg-info text-info-foreground" },
  Shortlisted: { label: "Shortlisted", icon: UserCheck, color: "bg-warning text-warning-foreground" },
  shortlisted: { label: "Shortlisted", icon: UserCheck, color: "bg-warning text-warning-foreground" },
  Interviewing: { label: "Interviewing", icon: UserCheck, color: "bg-warning text-warning-foreground" },
  interviewing: { label: "Interviewing", icon: UserCheck, color: "bg-warning text-warning-foreground" },
  Offered: { label: "Offered", icon: CheckCircle2, color: "bg-success text-success-foreground" },
  offered: { label: "Offered", icon: CheckCircle2, color: "bg-success text-success-foreground" },
  Accepted: { label: "Accepted", icon: CheckCircle2, color: "bg-success text-success-foreground" },
  accepted: { label: "Accepted", icon: CheckCircle2, color: "bg-success text-success-foreground" },
  selected: { label: "Selected", icon: CheckCircle2, color: "bg-success text-success-foreground" },
  Rejected: { label: "Rejected", icon: XCircle, color: "bg-destructive text-destructive-foreground" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-destructive text-destructive-foreground" },
};

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll every 15 minutes to check for application status updates
  useAutoRefreshPrompt(applications.length, fetchApplications, "application updates", 15);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const data = await fetchApplications();
        setApplications(data);
      } catch (error) {
        toast.error("Failed to load your applications.");
      } finally {
        setLoading(false);
      }
    };
    loadApplications();
  }, []);

  const normalize = (s: string) => s?.toLowerCase() || '';
  const counts = {
    applied: applications.filter((a) => normalize(a.status) === "applied").length,
    interviewing: applications.filter((a) => ["interviewing", "shortlisted"].includes(normalize(a.status))).length,
    selected: applications.filter((a) => ["selected", "offered", "accepted"].includes(normalize(a.status))).length,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Application Status</h1>
        <p className="text-muted-foreground">Track your job applications</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-info mb-2" />
            <p className="text-3xl font-bold font-display">{counts.applied}</p>
            <p className="text-sm text-muted-foreground">Applied</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center">
            <UserCheck className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-3xl font-bold font-display">{counts.interviewing}</p>
            <p className="text-sm text-muted-foreground">Interviewing</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-3xl font-bold font-display">{counts.selected}</p>
            <p className="text-sm text-muted-foreground">Selected</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">All Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {applications.map((app) => {
              const config = statusConfig[app.status] || { label: app.status, icon: Clock, color: "bg-muted text-muted-foreground" };
              const Icon = config.icon;
              return (
                <div key={app.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{app.jobTitle}</p>
                      <p className="text-sm text-muted-foreground">{app.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground hidden sm:block">{app.appliedAt}</span>
                    <Badge className={config.color}>{config.label}</Badge>
                  </div>
                </div>
              );
            })}

            {applications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>You haven't applied to any jobs yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}