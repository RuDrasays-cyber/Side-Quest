import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2, GraduationCap, Globe, MapPin, Users, Calendar, Search, Loader2,
  ExternalLink, Star, GitBranch, Send, CheckCircle2, XCircle, Clock, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAllCompanies, fetchAllUniversities, fetchGitHubRepos,
  sendPlacementRequest, fetchPlacementRequests, respondToPlacementRequest,
  type CompanyProfile, type UniversityProfile, type GitHubRepo, type PlacementRequest
} from "@/services/api";

export default function BrowseOrgs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCompany = user?.role === "company";
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [universities, setUniversities] = useState<UniversityProfile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [requestDialog, setRequestDialog] = useState<CompanyProfile | null>(null);
  const [requestMsg, setRequestMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState<PlacementRequest[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (isCompany) {
          const unis = await fetchAllUniversities();
          setUniversities(unis);
        } else {
          const comps = await fetchAllCompanies();
          setCompanies(comps);
        }
        const reqs = await fetchPlacementRequests();
        setRequests(reqs);
      } catch { toast.error("Failed to load organizations."); }
      finally { setLoading(false); }
    };
    load();
  }, [isCompany]);

  const handleViewOrg = async (org: any) => {
    setSelectedOrg(org);
    setRepos([]);
    const ghUser = org.github_username;
    if (ghUser) {
      setLoadingRepos(true);
      const r = await fetchGitHubRepos(ghUser);
      setRepos(r);
      setLoadingRepos(false);
    }
  };

  const handleSendRequest = async () => {
    if (!requestDialog) return;
    setSending(true);
    try {
      await sendPlacementRequest(requestDialog.id, requestMsg);
      toast.success("Placement camp request sent!");
      setRequestDialog(null);
      setRequestMsg("");
      const reqs = await fetchPlacementRequests();
      setRequests(reqs);
    } catch (err: any) { toast.error(err.message || "Failed to send request."); }
    finally { setSending(false); }
  };

  const handleRespondRequest = async (id: number, status: 'accepted' | 'declined') => {
    try {
      await respondToPlacementRequest(id, status);
      toast.success(`Request ${status}!`);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch { toast.error("Failed to respond."); }
  };

  const items = isCompany ? universities : companies;
  const filtered = items.filter((o: any) =>
    (o.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.location || "").toLowerCase().includes(search.toLowerCase())
  );

  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading organizations...</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 animate-fade-in pb-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-primary/10 rounded-full filter blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-accent/10 rounded-full filter blur-[100px]" />
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
          {isCompany ? "Browse Universities" : "Browse Companies"}
        </h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Search className="h-4 w-4" />
          {isCompany
            ? "Explore universities for placement partnerships"
            : "Discover companies and request placement camps"}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search organizations..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Pending requests section */}
      {!isCompany && pendingRequests.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader><CardTitle className="font-display text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-warning" /> Pending Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm p-2 bg-background/30 rounded-lg">
                <span>Sent to <strong>{r.company_name}</strong></span>
                <Badge variant="outline" className="text-warning border-warning/30">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isCompany && pendingRequests.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader><CardTitle className="font-display text-sm flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Incoming Placement Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm p-3 bg-background/30 rounded-lg">
                <div>
                  <span>From <strong>{r.university_name}</strong></span>
                  {r.message && <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-400/30" onClick={() => handleRespondRequest(r.id, 'accepted')}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="border-destructive/30 text-destructive" onClick={() => handleRespondRequest(r.id, 'declined')}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Org cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((org: any) => (
          <Card key={org.id} className="border-border bg-card/40 backdrop-blur-md hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
            onClick={() => handleViewOrg(org)}>
            <CardContent className="pt-5 pb-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
                  {isCompany ? <GraduationCap className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <p className="font-display font-semibold group-hover:text-primary transition-colors">{org.name}</p>
                  {org.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{org.location}</p>}
                </div>
              </div>

              {org.description && <p className="text-sm text-muted-foreground line-clamp-2">{org.description}</p>}

              <div className="flex flex-wrap gap-1.5">
                {(org.specializations || []).slice(0, 3).map((s: string) => (
                  <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                ))}
                {org.accreditation && <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-400"><ShieldCheck className="h-2.5 w-2.5 mr-0.5" />{org.accreditation}</Badge>}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {org.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Website</span>}
                {org.team_size && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {org.team_size}</span>}
                {org.student_count && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {org.student_count.toLocaleString()} students</span>}
                {org.github_username && <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> GitHub</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
          No organizations found.
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedOrg && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  {isCompany ? <GraduationCap className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}
                  {selectedOrg.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {selectedOrg.description && <p className="text-sm text-muted-foreground leading-relaxed">{selectedOrg.description}</p>}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedOrg.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{selectedOrg.location}</span></div>}
                  {selectedOrg.website && <a href={selectedOrg.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline"><Globe className="h-4 w-4" />{selectedOrg.website}</a>}
                  {selectedOrg.team_size && <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span>{selectedOrg.team_size} employees</span></div>}
                  {selectedOrg.student_count && <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span>{selectedOrg.student_count.toLocaleString()} students</span></div>}
                  {selectedOrg.founded_year && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Founded {selectedOrg.founded_year}</span></div>}
                  {selectedOrg.accreditation && <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /><span>{selectedOrg.accreditation}</span></div>}
                </div>

                {(selectedOrg.specializations || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOrg.specializations.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}

                {/* GitHub repos */}
                {loadingRepos && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading repos...</div>}
                {repos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-1.5"><GitBranch className="h-4 w-4 text-primary" /> Public Repositories</p>
                    <div className="divide-y divide-white/5 border border-white/5 rounded-lg overflow-hidden">
                      {repos.map(repo => (
                        <div key={repo.id} className="px-3 py-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                              {repo.name} <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{repo.description || "No description"}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {repo.language && <Badge variant="outline" className="text-[9px] py-0">{repo.language}</Badge>}
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Star className="h-2.5 w-2.5" />{repo.stargazers_count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setSelectedOrg(null)}>Close</Button>
                {!isCompany ? (
                  <Button className="bg-primary hover:bg-primary/90" onClick={() => { setRequestDialog(selectedOrg); setSelectedOrg(null); }}>
                    <Send className="mr-2 h-4 w-4" /> Request Placement Camp
                  </Button>
                ) : (
                  <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate(`/dashboard/post-job?target_university_id=${selectedOrg.id}&uni_name=${encodeURIComponent(selectedOrg.name || selectedOrg.university_name)}`)}>
                    <Building2 className="mr-2 h-4 w-4" /> Start Placement Camp
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Request dialog */}
      <Dialog open={!!requestDialog} onOpenChange={(open) => !open && setRequestDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Request Placement Camp</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Send a placement camp request to <strong>{requestDialog?.name}</strong>. They will be notified and can respond.</p>
          <Textarea placeholder="Describe your placement requirements, expected student count, preferred timeline..." value={requestMsg} onChange={(e) => setRequestMsg(e.target.value)} rows={4} className="bg-background/50 border-white/10" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialog(null)}>Cancel</Button>
            <Button onClick={handleSendRequest} disabled={sending}>
              {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Send Request</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
