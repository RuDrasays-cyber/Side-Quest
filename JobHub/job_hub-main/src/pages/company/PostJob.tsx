import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle, Loader2 } from "lucide-react";
import { postJob, fetchMyCompanyProfile } from "@/services/api";

export default function PostJob() {
  const [searchParams] = useSearchParams();
  const targetUniversityId = searchParams.get('target_university_id');
  const targetUniversityName = searchParams.get('uni_name');

  const [form, setForm] = useState({ title: "", location: "", salary: "", type: "Full-time", description: "", tags: "", required_skills: "", department: "", min_cgpa: "" });
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const profile = await fetchMyCompanyProfile();
        setIsVerified(profile?.is_verified_by_admin || false);
      } catch {
        setIsVerified(false);
      }
    };
    checkVerification();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await postJob({
        ...form,
        is_off_campus: !targetUniversityId,
        target_university_id: targetUniversityId ? Number(targetUniversityId) : undefined,
        min_cgpa: form.min_cgpa ? Number(form.min_cgpa) : 0,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        required_skills: form.required_skills.split(",").map(t => t.trim()).filter(Boolean) as any,
      });
      toast.success("Job posted successfully!");
      setForm({ title: "", location: "", salary: "", type: "Full-time", description: "", tags: "", required_skills: "", department: "", min_cgpa: "" });
    } catch (error: any) {
      console.error("Job posting failed:", error);
      toast.error(error?.message || "Failed to post job.");
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">
          {targetUniversityId ? `Host On-Campus Drive: ${targetUniversityName}` : "Post a Job"}
        </h1>
        <p className="text-muted-foreground">
          {targetUniversityId ? "This job will exclusively be securely scoped only to candidates native to this university" : "Create a new job listing for students"}
        </p>
      </div>
      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <PlusCircle className="h-5 w-5" /> Job Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isVerified === null ? (
            <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : isVerified === false ? (
            <div className="text-center py-10 space-y-4">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <PlusCircle className="h-6 w-6 text-destructive opacity-80" />
              </div>
              <h2 className="text-xl font-bold font-display">Awaiting Verification</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your corporate account is currently under review by our Super Admins.
                You will be able to publish jobs once your account is fully verified.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Frontend Developer" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Remote" required />
                </div>
                <div className="space-y-2">
                  <Label>Salary Range</Label>
                  <Input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="e.g. 50000" required />
                  <p className="text-xs text-muted-foreground">Numeric value only (e.g. 500000 for 5LPA)</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Minimum CGPA</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="10" 
                    value={form.min_cgpa} 
                    onChange={(e) => setForm({ ...form, min_cgpa: e.target.value })} 
                    placeholder="e.g. 7.5" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Data Science">Data Science</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the role..." rows={5} required />
              </div>
              <div className="space-y-2">
                <Label>Required Skills (comma separated)</Label>
                <Input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} placeholder="e.g. React, TypeScript, Node.js, PostgreSQL" />
                <p className="text-xs text-muted-foreground">These skills are used to score candidate resumes</p>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="React, TypeScript, Node.js" />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "Publishing..." : "Publish Job"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}