import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Briefcase, MapPin, IndianRupee, Search, GraduationCap, Globe, Building2, Loader2, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getCampusTag } from "@/lib/domainUtils";
import { fetchJobs, applyToJob, fetchApplications, scoreResumeAgainstJob, Job, type ScoringResult } from "@/services/api";
import { useAutoRefreshPrompt } from "@/hooks/useAutoRefreshPrompt";

const DEPARTMENTS = ["All", "Engineering", "Marketing", "Finance", "HR", "Design", "Data Science", "Operations", "Sales", "Legal"];

export default function JobFeed() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoringResult | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const campusTag = user ? getCampusTag(user.email) : "Off Campus";

  useAutoRefreshPrompt(jobs.length, fetchJobs, "job postings", 15);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jobsData, appsData] = await Promise.all([
          fetchJobs(),
          fetchApplications().catch(() => []),
        ]);
        setJobs(jobsData);
        // Track which jobs the student already applied to
        const appliedIds = new Set(appsData.map((a: any) => String(a.jobId || a.job_id)));
        setAppliedJobIds(appliedIds);
      } catch (error) {
        toast.error("Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const companies = [...new Set(jobs.map((j) => j.company).filter(Boolean))];

  const filtered = jobs.filter((job) => {
    const searchToken = search.toLowerCase();
    const matchSearch = job.title?.toLowerCase().includes(searchToken) 
      || job.company?.toLowerCase().includes(searchToken)
      || (job.tags || []).some(t => t.toLowerCase().includes(searchToken))
      || (job.required_skills || []).some(s => s.toLowerCase().includes(searchToken));
    const matchCompany = companyFilter === "all" || job.company === companyFilter;
    const matchType = typeFilter === "all" || job.type === typeFilter;
    const matchDept = deptFilter === "All" || (job.department || "").toLowerCase() === deptFilter.toLowerCase()
      || (job.tags || []).some(t => t.toLowerCase() === deptFilter.toLowerCase());
    return matchSearch && matchCompany && matchType && matchDept;
  });

  const handleApply = async (job: Job) => {
    if (appliedJobIds.has(String(job.id))) {
      toast.error("You have already applied to this job.");
      return;
    }
    setApplying(true);
    try {
      await applyToJob(job.id);
      toast.success(`Applied to ${job.title} at ${job.company}!`);
      setAppliedJobIds(prev => new Set(prev).add(String(job.id)));
      setSelectedJob(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to apply.");
    } finally {
      setApplying(false);
    }
  };

  const handleCompareProfile = async (job: Job) => {
    setScoring(true);
    setScoreResult(null);
    try {
      const result = await scoreResumeAgainstJob(job.id);
      setScoreResult(result);
    } catch (err: any) {
      toast.error(err.message || "Could not score your profile. Make sure your resume is uploaded.");
    } finally {
      setScoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading job feed...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Job Feed</h1>
        <p className="text-muted-foreground">Showing available opportunities for you</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge className={campusTag === "On Campus" ? "bg-success text-success-foreground" : "bg-info text-info-foreground"}>
            {campusTag === "On Campus" ? <GraduationCap className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
            {campusTag}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Company" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Job Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Full-time">Full-time</SelectItem>
            <SelectItem value="Part-time">Part-time</SelectItem>
            <SelectItem value="Internship">Internship</SelectItem>
            <SelectItem value="Contract">Contract</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((job) => (
          <Card key={job.id} className="shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 group cursor-pointer" onClick={() => { setSelectedJob(job); setScoreResult(null); }}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-display group-hover:text-primary transition-colors">{job.title}</CardTitle>
                  <p className="text-sm text-muted-foreground font-medium">{job.company}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {(job.tags || []).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location || "Remote"}</span>
                <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{job.salary ? `${Number(job.salary).toLocaleString('en-IN')}` : "Competitive"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No jobs available at the moment.</p>
        </div>
      )}

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => { if (!open) { setSelectedJob(null); setScoreResult(null); } }}>
        <DialogContent className="max-w-2xl">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedJob.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{selectedJob.company}</span>
                  {selectedJob.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selectedJob.location}</span>}
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="space-y-5">
                <div>
                  <h3 className="font-display font-semibold text-sm mb-2">About the Role</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedJob.description}</p>
                </div>

                {(selectedJob.required_skills || selectedJob.tags || []).length > 0 && (
                  <div>
                    <h3 className="font-display font-semibold text-sm mb-2">Required Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedJob.required_skills || selectedJob.tags || []).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score Result */}
                {scoreResult && (
                  <div className="border border-primary/20 rounded-xl p-5 bg-primary/5 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 shrink-0">
                        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
                            strokeDasharray={`${scoreResult.match_percentage}, 100`}
                            className="transition-all duration-1000 ease-out" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-primary">
                          {Math.round(scoreResult.match_percentage)}%
                        </span>
                      </div>
                      <div>
                        <p className="font-display font-semibold text-lg">Profile Match Score</p>
                        <p className="text-xs text-muted-foreground">Based on your resume vs. job requirements</p>
                      </div>
                    </div>

                    {scoreResult.matched.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Matched Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {scoreResult.matched.map(s => <Badge key={s} className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-400/30">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                    {scoreResult.missing.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> Missing Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {scoreResult.missing.map(s => <Badge key={s} className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4 gap-2">
                <Button variant="outline" onClick={() => handleCompareProfile(selectedJob)} disabled={scoring}>
                  {scoring ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scoring...</> : <><BarChart3 className="mr-2 h-4 w-4" /> Compare Profile</>}
                </Button>
                <Button 
                  onClick={() => handleApply(selectedJob)} 
                  className="gradient-primary text-primary-foreground border-0"
                  disabled={applying || appliedJobIds.has(String(selectedJob.id))}
                >
                  {appliedJobIds.has(String(selectedJob.id)) 
                    ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Applied</>
                    : applying 
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying...</>
                      : "Apply Now"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}