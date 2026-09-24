import { useState, useEffect } from "react";
import { fetchMyPostedJobs, deleteJob, type Job } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Briefcase, MapPin, Loader2, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export default function PostedJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await fetchMyPostedJobs();
      setJobs(data);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load your posted jobs.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;
    
    try {
      await deleteJob(jobId);
      toast.success("Job deleted successfully.");
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete job.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Posted Jobs</h1>
          <p className="text-muted-foreground">Manage the job listings you have published.</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card className="text-center py-12 bg-muted/20">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">No jobs posted yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            You haven't posted any jobs. Head over to the Post a Job tab to get started.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="shadow-card hover:shadow-lg transition-shadow border-border flex flex-col">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg font-display line-clamp-1">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {job.type}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <div className="space-y-2 mb-4 text-sm text-muted-foreground flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="line-clamp-1">{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 shrink-0 text-green-500" />
                    <span>{job.salary === "0" || job.salary === "" ? "Not Disclosed" : job.salary}</span>
                  </div>
                  {job.min_cgpa && Number(job.min_cgpa) > 0 && (
                    <div className="flex items-center gap-2 text-blue-500/80">
                      <span className="font-medium text-xs border rounded-sm px-1 shrink-0">CGPA</span>
                      <span>{job.min_cgpa}+ Required</span>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-auto text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(job.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Job
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
