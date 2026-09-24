import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Inbox, ExternalLink, Loader2, Calendar, Building2, BookOpen,
  UserCheck, Video, MapPin, Clock, Users, CheckCircle2,
  FileText, Mail, ChevronDown, ChevronUp, Layers, Eye, Send,
  XCircle, Trophy
} from "lucide-react";
import { toast } from "sonner";
import { fetchCandidates, updateCandidateStatus, sendInterviewEmail, acceptCandidate, rejectCandidate, type Candidate } from "@/services/api";
import { useAutoRefreshPrompt } from "@/hooks/useAutoRefreshPrompt";

const statusColors: Record<string, string> = {
  applied: "bg-info/10 text-info border-info/30",
  pending: "bg-warning/10 text-warning border-warning/30",
  shortlisted: "bg-emerald-500/10 text-emerald-400 border-emerald-400/30",
  interviewing: "bg-violet-500/10 text-violet-400 border-violet-400/30",
  offered: "bg-amber-500/10 text-amber-400 border-amber-400/30",
  accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-400/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

interface JobGroup {
  jobId: string;
  jobTitle: string;
  candidates: Candidate[];
  expanded: boolean;
}

export default function CandidateInbox() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobGroups, setJobGroups] = useState<JobGroup[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Candidate | null>(null);
  const [scheduleCandidate, setScheduleCandidate] = useState<Candidate | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [interviewMode, setInterviewMode] = useState<string>("");
  const [interviewLevel, setInterviewLevel] = useState<string>("");
  const [interviewForm, setInterviewForm] = useState({
    date: "", time: "", meetLink: "", venue: "", description: "",
    message: "Congratulations! Your profile has been shortlisted. We would like to invite you for an interview."
  });

  useAutoRefreshPrompt(candidates.length, fetchCandidates, "job applications", 15);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCandidates();
        setCandidates(data);
        buildJobGroups(data);
      } catch {
        toast.error("Failed to load candidates.");
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const buildJobGroups = (data: Candidate[]) => {
    const groupMap = new Map<string, JobGroup>();
    data.forEach((c) => {
      const key = c.jobId || "unknown";
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          jobId: key,
          jobTitle: c.jobTitle || "Untitled Position",
          candidates: [],
          expanded: true,
        });
      }
      groupMap.get(key)!.candidates.push(c);
    });
    setJobGroups(Array.from(groupMap.values()));
  };

  const shortlisted = candidates.filter(c => c.status === "shortlisted");

  const toggleGroup = (jobId: string) => {
    setJobGroups(prev => prev.map(g => g.jobId === jobId ? { ...g, expanded: !g.expanded } : g));
  };

  const handleAccept = async (id: string, name: string) => {
    try {
      await acceptCandidate(id);
      toast.success(`Candidate ${name} selected and offer sent!`);
      const updated = candidates.map(c => c.id === id ? { ...c, status: "accepted" as const } : c);
      setCandidates(updated);
      buildJobGroups(updated);
      setSelectedProfile(null);
    } catch { toast.error(`Failed to accept ${name}.`); }
  };

  const handleReject = async (id: string, name: string) => {
    try {
      await rejectCandidate(id);
      toast.success(`Candidate ${name} rejected.`);
      const updated = candidates.map(c => c.id === id ? { ...c, status: "rejected" as const } : c);
      setCandidates(updated);
      buildJobGroups(updated);
      setSelectedProfile(null);
    } catch { toast.error(`Failed to reject ${name}.`); }
  };

  const handleStatusChange = async (id: string, newStatus: Candidate["status"]) => {
    try {
      await updateCandidateStatus(id, newStatus);
      toast.success(`Candidate ${newStatus === "shortlisted" ? "shortlisted ✓" : "status updated"}`);
      const updated = candidates.map(c => c.id === id ? { ...c, status: newStatus } : c);
      setCandidates(updated);
      buildJobGroups(updated);
      setSelectedProfile(null);
    } catch { toast.error("Failed to update status."); }
  };

  const resetInterviewForm = () => {
    setInterviewMode("");
    setInterviewLevel("");
    setInterviewForm({
      date: "", time: "", meetLink: "", venue: "", description: "",
      message: "Congratulations! Your profile has been shortlisted. We would like to invite you for an interview."
    });
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleCandidate || !interviewMode) { toast.error("Please select an interview mode."); return; }
    if (interviewMode === "online" && !interviewForm.meetLink) { toast.error("Please provide a meeting link."); return; }
    if (interviewMode === "offline" && !interviewForm.venue) { toast.error("Please provide the venue."); return; }
    if (!interviewLevel) { toast.error("Please select an interview level."); return; }
    setSendingEmail(true);
    try {
      await sendInterviewEmail(scheduleCandidate.id, {
        date: interviewForm.date,
        time: interviewForm.time,
        mode: interviewMode,
        meetLink: interviewMode === "online" ? interviewForm.meetLink : undefined,
        venue: interviewMode === "offline" ? interviewForm.venue : undefined,
        level: interviewLevel,
        description: interviewForm.description,
        message: interviewForm.message,
      });
      toast.success(`Interview invitation sent to ${scheduleCandidate.name}!`);
      // Update local state to interviewing
      const updated = candidates.map(c => c.id === scheduleCandidate.id ? { ...c, status: "interviewing" as const } : c);
      setCandidates(updated);
      buildJobGroups(updated);
      setScheduleCandidate(null);
      resetInterviewForm();
    } catch { toast.error("Failed to send interview invitation."); }
    finally { setSendingEmail(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 animate-fade-in pb-10">
      {/* Ambient gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-primary/8 rounded-full filter blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/8 rounded-full filter blur-[100px]" />
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Candidate Hub</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" /> Manage incoming applications, shortlist, and schedule interviews.
        </p>
      </div>

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="mb-6 bg-card border border-border h-auto p-1">
          <TabsTrigger value="applications" className="py-2.5 px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Inbox className="w-4 h-4 mr-2" /> All Applications
          </TabsTrigger>
          <TabsTrigger value="shortlisted" className="py-2.5 px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserCheck className="w-4 h-4 mr-2" /> Shortlisted
            {shortlisted.length > 0 && (
              <span className="ml-2 bg-primary/20 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">{shortlisted.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Applications grouped by job */}
        <TabsContent value="applications" className="m-0">
          <div className="space-y-4">
            {jobGroups.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/10 rounded-xl text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-20" />
                No applications received yet.
              </div>
            ) : jobGroups.map((group) => (
              <Card key={group.jobId} className="border-border bg-card/40 backdrop-blur-md overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.jobId)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors border-b border-white/5"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-lg text-foreground">{group.jobTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.candidates.length} application{group.candidates.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {group.expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </button>

                {group.expanded && (
                  <div className="divide-y divide-white/5">
                    {group.candidates.map((c) => (
                      <div
                        key={c.id}
                        className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.015] transition-colors relative"
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                              {c.name?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground">{c.name}</p>
                              <Badge variant="outline" className={`text-xs ${c.isOnCampus ? "text-emerald-400 border-emerald-400/30" : "text-info border-info/30"}`}>
                                {c.isOnCampus ? "On Campus" : "Off Campus"}
                              </Badge>
                              {typeof c.cgpa === "number" && (
                                <Badge variant="outline" className="text-xs border-amber-400/30 text-amber-400">
                                  <BookOpen className="h-3 w-3 mr-1" /> {c.cgpa.toFixed(2)} CGPA
                                </Badge>
                              )}
                              {typeof c.matchScore === "number" && (
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary scale-100 hover:scale-105 transition-transform">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> {c.matchScore.toFixed(0)}% Match
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{c.email}</p>
                            {c.skills && c.skills.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {c.skills.slice(0, 4).map((s) => (
                                  <span key={s} className="text-[10px] px-1.5 py-0.5 bg-primary/5 border border-primary/10 text-primary rounded-md">{s}</span>
                                ))}
                                {c.skills.length > 4 && (
                                  <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">+{c.skills.length - 4} more</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`capitalize ${statusColors[c.status] || ""}`}>{c.status}</Badge>

                          {/* Hover action buttons */}
                          <div className={`flex items-center gap-2 transition-all duration-200 ${hoveredId === c.id ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"}`}>
                            <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5 h-8" onClick={() => setSelectedProfile(c)}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                            {c.status === "interviewing" ? (
                              <>
                                <Button size="sm" className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 h-8" onClick={() => handleReject(c.id, c.name)}>
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                                <Button size="sm" className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-400/30 h-8" onClick={() => handleAccept(c.id, c.name)}>
                                  <Trophy className="h-3.5 w-3.5 mr-1" /> Accept
                                </Button>
                              </>
                            ) : c.status !== "shortlisted" && c.status !== "accepted" && c.status !== "rejected" ? (
                              <Button size="sm" className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 h-8" onClick={() => handleStatusChange(c.id, "shortlisted")}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Shortlist
                              </Button>
                            ) : c.status === "shortlisted" ? (
                              <Button size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 h-8" onClick={() => setScheduleCandidate(c)}>
                                <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Shortlisted */}
        <TabsContent value="shortlisted" className="m-0">
          {shortlisted.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-xl text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
              No shortlisted candidates yet. Review applications and shortlist promising candidates.
            </div>
          ) : (
            <div className="space-y-3">
              {shortlisted.map((c) => (
                <Card
                  key={c.id}
                  className="border-border bg-card/40 backdrop-blur-md group relative overflow-hidden transition-all hover:border-primary/30 duration-300"
                  onMouseEnter={() => setHoveredId(c.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <CardContent className="py-4 px-6 relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-emerald-400/30">
                        <AvatarFallback className="bg-emerald-500/10 text-emerald-400 font-bold">
                          {c.name?.slice(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold font-display">{c.name}</p>
                          <Badge variant="outline" className="text-xs border-emerald-400/30 text-emerald-400">Shortlisted</Badge>
                          {typeof c.cgpa === "number" && (
                            <Badge variant="outline" className="text-xs border-amber-400/30 text-amber-400">
                              {c.cgpa.toFixed(2)} CGPA
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{c.email} · {c.jobTitle}</p>
                        {c.skills && c.skills.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {c.skills.slice(0, 5).map((s) => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-primary/5 border border-primary/10 text-primary rounded-md">{s}</span>
                            ))}
                            {c.skills.length > 5 && <span className="text-[10px] text-muted-foreground">+{c.skills.length - 5}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hover buttons on right */}
                    <div className={`flex items-center gap-2 transition-all duration-200 ${hoveredId === c.id ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 hover:border-white/20"
                        onClick={() => setSelectedProfile(c)}
                      >
                        <Eye className="mr-1.5 h-4 w-4" /> View
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                        onClick={() => setScheduleCandidate(c)}
                      >
                        <Calendar className="mr-1.5 h-4 w-4" /> Schedule Interview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ========== Student Profile Sheet ========== */}
      <Sheet open={!!selectedProfile} onOpenChange={open => !open && setSelectedProfile(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background/95 backdrop-blur-xl border-border">
          {selectedProfile && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/30">
                    <AvatarFallback className="bg-primary/10 text-primary font-display text-xl font-bold">
                      {selectedProfile.name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="font-display text-xl">{selectedProfile.name}</SheetTitle>
                    <SheetDescription className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {selectedProfile.email}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card/50 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" /> Campus</p>
                    <p className="font-medium">{selectedProfile.isOnCampus ? "On Campus" : "Off Campus"}</p>
                  </div>
                  <div className="bg-card/50 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><BookOpen className="h-3 w-3" /> CGPA</p>
                    <p className="font-medium text-lg">{typeof selectedProfile.cgpa === "number" ? selectedProfile.cgpa.toFixed(2) : "N/A"}<span className="text-xs text-muted-foreground"> / 10</span></p>
                  </div>
                  <div className="bg-card/50 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1">Applied For</p>
                    <p className="font-medium text-sm">{selectedProfile.jobTitle || "—"}</p>
                  </div>
                  <div className="bg-card/50 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1">Applied</p>
                    <p className="font-medium text-sm">{selectedProfile.appliedAt || "Recently"}</p>
                  </div>
                </div>

                {/* Skills */}
                {selectedProfile.skills && selectedProfile.skills.length > 0 && (
                  <div className="bg-card/50 rounded-xl p-4 border border-white/5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.skills.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs border-primary/20 text-primary bg-primary/5">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* University */}
                {selectedProfile.university && (
                  <div className="bg-card/50 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1">University</p>
                    <p className="font-medium text-sm">{selectedProfile.university}</p>
                  </div>
                )}

                {selectedProfile.resumeUrl && selectedProfile.resumeUrl !== "#" && (
                  <Button variant="outline" className="w-full border-white/10 hover:border-primary/40" onClick={() => window.open(selectedProfile.resumeUrl, "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" /> View Resume
                  </Button>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Actions</p>
                {selectedProfile.status === "interviewing" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5" onClick={() => handleReject(selectedProfile.id, selectedProfile.name)}>
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => handleAccept(selectedProfile.id, selectedProfile.name)}>
                      <Trophy className="mr-2 h-4 w-4" /> Accept & Offer
                    </Button>
                  </div>
                ) : selectedProfile.status === "accepted" ? (
                  <Badge variant="outline" className="w-full justify-center py-2 text-amber-400 border-amber-400/30">
                    <Trophy className="mr-2 h-4 w-4" /> Candidate Selected
                  </Badge>
                ) : selectedProfile.status === "rejected" ? (
                  <Badge variant="outline" className="w-full justify-center py-2 text-destructive border-destructive/30">
                    <XCircle className="mr-2 h-4 w-4" /> Candidate Rejected
                  </Badge>
                ) : selectedProfile.status !== "shortlisted" ? (
                  <Button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-400/30" onClick={() => handleStatusChange(selectedProfile.id, "shortlisted")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Shortlist Candidate
                  </Button>
                ) : (
                  <>
                    <Badge variant="outline" className="w-full justify-center py-2 text-emerald-400 border-emerald-400/30">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Already Shortlisted
                    </Badge>
                    <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => { setSelectedProfile(null); setScheduleCandidate(selectedProfile); }}>
                      <Calendar className="mr-2 h-4 w-4" /> Schedule Interview
                    </Button>
                  </>
                )}
                {selectedProfile.status !== "rejected" && selectedProfile.status !== "interviewing" && selectedProfile.status !== "accepted" && (
                  <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/5" onClick={() => handleStatusChange(selectedProfile.id, "rejected")}>
                    Reject Application
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ========== Schedule Interview Dialog ========== */}
      <Dialog open={!!scheduleCandidate} onOpenChange={open => { if (!open) { setScheduleCandidate(null); resetInterviewForm(); } }}>
        <DialogContent className="sm:max-w-xl bg-background/95 backdrop-blur-xl border-border max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleScheduleInterview}>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Schedule Interview
              </DialogTitle>
              <DialogDescription>
                Send an official invitation to <span className="font-semibold text-foreground">{scheduleCandidate?.name}</span>
                {scheduleCandidate?.jobTitle && <> for <span className="font-semibold text-foreground">{scheduleCandidate?.jobTitle}</span></>}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iv-date" className="flex items-center gap-1.5 text-sm"><Calendar className="h-3.5 w-3.5 text-primary" /> Date</Label>
                  <Input id="iv-date" type="date" value={interviewForm.date} onChange={e => setInterviewForm({ ...interviewForm, date: e.target.value })} required className="bg-background/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iv-time" className="flex items-center gap-1.5 text-sm"><Clock className="h-3.5 w-3.5 text-primary" /> Time</Label>
                  <Input id="iv-time" type="time" value={interviewForm.time} onChange={e => setInterviewForm({ ...interviewForm, time: e.target.value })} required className="bg-background/50 border-white/10" />
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="iv-desc" className="flex items-center gap-1.5 text-sm"><FileText className="h-3.5 w-3.5 text-primary" /> Job Description / Additional Details</Label>
                <Textarea
                  id="iv-desc" rows={3} placeholder="Provide detailed information about the role, expectations, or preparation tips..."
                  value={interviewForm.description} onChange={e => setInterviewForm({ ...interviewForm, description: e.target.value })}
                  className="bg-background/50 border-white/10 resize-none"
                />
              </div>

              {/* Mode Dropdown */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm"><MapPin className="h-3.5 w-3.5 text-primary" /> Interview Mode</Label>
                <Select value={interviewMode} onValueChange={setInterviewMode}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue placeholder="Select mode..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">
                      <span className="flex items-center gap-2"><Video className="h-4 w-4" /> Online (Virtual)</span>
                    </SelectItem>
                    <SelectItem value="offline">
                      <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Offline (In-Person)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Online → Meeting Link */}
              {interviewMode === "online" && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="meet-link" className="flex items-center gap-1.5 text-sm">
                    <Video className="h-3.5 w-3.5 text-primary" /> Meeting Platform URL
                  </Label>
                  <Input
                    id="meet-link" placeholder="https://meet.google.com/... or https://zoom.us/..."
                    value={interviewForm.meetLink} onChange={e => setInterviewForm({ ...interviewForm, meetLink: e.target.value })}
                    className="bg-background/50 border-white/10"
                  />
                </div>
              )}

              {/* Offline → Venue */}
              {interviewMode === "offline" && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="venue" className="flex items-center gap-1.5 text-sm">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Venue
                  </Label>
                  <Input
                    id="venue" placeholder="e.g., 3rd Floor, TechCorp HQ, Sector 62, Noida"
                    value={interviewForm.venue} onChange={e => setInterviewForm({ ...interviewForm, venue: e.target.value })}
                    className="bg-background/50 border-white/10"
                  />
                </div>
              )}

              {/* Level Dropdown */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm"><Layers className="h-3.5 w-3.5 text-primary" /> Interview Level</Label>
                <Select value={interviewLevel} onValueChange={setInterviewLevel}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue placeholder="Select level..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Level — Interview Only</SelectItem>
                    <SelectItem value="multilevel">Multi-Level — Additional Examination Phases</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="iv-msg" className="flex items-center gap-1.5 text-sm"><Mail className="h-3.5 w-3.5 text-primary" /> Message to Candidate</Label>
                <Textarea
                  id="iv-msg" rows={2}
                  value={interviewForm.message} onChange={e => setInterviewForm({ ...interviewForm, message: e.target.value })}
                  className="bg-background/50 border-white/10 resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setScheduleCandidate(null); resetInterviewForm(); }}>Cancel</Button>
              <Button type="submit" disabled={sendingEmail || !interviewMode || !interviewLevel} className="bg-primary hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                {sendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}