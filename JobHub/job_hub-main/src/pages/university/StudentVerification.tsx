import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, CheckCircle, Globe, Loader2 } from "lucide-react";
import { getEmailDomain } from "@/lib/domainUtils";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentVerifications, StudentVerification as StudentVerifType } from "@/services/api";
import { toast } from "sonner";
import { useAutoRefreshPrompt } from "@/hooks/useAutoRefreshPrompt";
import { Button } from "@/components/ui/button";

export default function StudentVerification() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentVerifType[]>([]);
  const [loading, setLoading] = useState(true);

  const universityDomain = user ? getEmailDomain(user.email) : "";

  // Poll every 15 minutes to silently check for new student registrations
  useAutoRefreshPrompt(students.length, async () => {
    const data = await fetchStudentVerifications();
    return data.filter(s => getEmailDomain(s.email) === universityDomain);
  }, "student registrations", 15);

  useEffect(() => {
    const loadVerifications = async () => {
      try {
        const data = await fetchStudentVerifications();
       
        const filtered = data.filter(s => getEmailDomain(s.email) === universityDomain);
        setStudents(filtered);
      } catch (error) {
        toast.error("Failed to load student verifications.");
      } finally {
        setLoading(false);
      }
    };
    loadVerifications();
  }, [universityDomain]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading registered students...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Student Verification</h1>
        <p className="text-muted-foreground">On-campus students auto-verified via your university domains</p>
      </div>

      <Card className="shadow-card border-l-4 border-l-success">
        <CardContent className="pt-4 pb-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="font-semibold text-sm">Automatic Domain Verification Active</p>
            <p className="text-xs text-muted-foreground">
              Students registering with your verified domain (<span className="font-semibold text-foreground">{universityDomain}</span>) are
              automatically verified.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> On-Campus Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Resume</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      <Globe className="h-3 w-3" />
                      {getEmailDomain(s.email)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.resumeUrl ? (
                      <Button variant="outline" size="sm" onClick={() => window.open(s.resumeUrl, '_blank')} className="h-8 shadow-sm">
                        View PDF
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Not uploaded</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.submittedAt || "Recently"}</TableCell>
                  <TableCell>
                    <Badge className={s.status === 'verified' ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
                      {s.status === 'verified' ? "Auto-Verified" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {students.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">No on-campus students registered yet.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Only on-campus students from your university are shown. Off-campus registrations are not visible here.
      </p>
    </div>
  );
}