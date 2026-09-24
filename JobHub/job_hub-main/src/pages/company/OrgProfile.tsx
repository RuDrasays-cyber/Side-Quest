import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, MapPin, Users, Calendar, Loader2, Save, ExternalLink, Star, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { fetchMyCompanyProfile, updateCompanyProfile, fetchGitHubRepos, type CompanyProfile, type GitHubRepo } from "@/services/api";

export default function OrgProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    website: "",
    location: "",
    team_size: "",
    specializations: "",
    founded_year: "",
    github_username: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMyCompanyProfile();
        if (data) {
          setProfile(data);
          setForm({
            name: data.name || "",
            description: data.description || "",
            website: data.website || "",
            location: data.location || "",
            team_size: data.team_size || "",
            specializations: (data.specializations || []).join(", "),
            founded_year: data.founded_year?.toString() || "",
            github_username: data.github_username || "",
          });
          if (data.github_username) {
            const r = await fetchGitHubRepos(data.github_username);
            setRepos(r);
          }
        } else {
          // No companies row yet — pull org name from profiles table
          const { supabase } = await import("@/services/api");
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profileData } = await supabase.from('profiles').select('name').eq('id', session.user.id).single();
            if (profileData?.name) {
              setForm(prev => ({ ...prev, name: profileData.name }));
            }
          }
        }
      } catch { toast.error("Failed to load company profile."); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCompanyProfile({
        name: form.name || null,
        description: form.description || null,
        website: form.website || null,
        location: form.location || null,
        team_size: form.team_size || null,
        specializations: form.specializations ? form.specializations.split(",").map(s => s.trim()).filter(Boolean) : null,
        founded_year: form.founded_year ? parseInt(form.founded_year) : null,
      });
      toast.success("Organization profile updated!");

      if (form.github_username && form.github_username !== profile?.github_username) {
        const r = await fetchGitHubRepos(form.github_username);
        setRepos(r);
      }
    } catch (err: any) {
      console.error("OrgProfile save error:", err);
      toast.error(err?.message || "Failed to save.");
    }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading organization profile...</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 animate-dgrsdc e-in pb-10 max-w-4xl mx-auto">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-primary/10 rounded-full filter blur-[120px]" />
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">My Organization</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Tell universities and candidates about your company
        </p>
      </div>

      <Card className="border-border bg-card/40 backdrop-blur-xl shadow-elevated relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <CardHeader className="border-b border-white/5 relative z-10">
          <CardTitle className="font-display flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Company Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 relative z-10 space-y-5">
          {profile?.is_verified_by_admin === false && (
            <div className="bg-warning/10 border border-warning/30 text-warning px-4 py-3 rounded-lg flex items-center gap-3">
              <Building2 className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Verification Pending</p>
                <p className="opacity-90">Please fill out your complete profile and save. A Super Admin will review your details to approve job posting access.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input placeholder="Acme Corp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label>About</Label>
            <Textarea rows={4} placeholder="Describe your company, its mission, and what makes it unique..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-background/50 border-white/10 resize-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Website</Label>
              <Input placeholder="https://yourcompany.com" value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location</Label>
              <Input placeholder="e.g. San Francisco, CA" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Team Size</Label>
              <Input placeholder="e.g. 50-200" value={form.team_size}
                onChange={(e) => setForm({ ...form, team_size: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Founded Year</Label>
              <Input type="number" placeholder="e.g. 2015" value={form.founded_year}
                onChange={(e) => setForm({ ...form, founded_year: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Specializations (comma separated)</Label>
            <Input placeholder="e.g. AI/ML, Cloud, FinTech" value={form.specializations}
              onChange={(e) => setForm({ ...form, specializations: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" /> GitHub Organization</Label>
            <Input placeholder="e.g. google" value={form.github_username} disabled={profile?.is_verified_by_admin === false}
              onChange={(e) => setForm({ ...form, github_username: e.target.value })} />
            <p className="text-xs text-muted-foreground">Enter your GitHub org/username to display public repos</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11 bg-primary hover:bg-primary/90">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>
        </CardContent>
      </Card>

      {/* GitHub Repos */}
      {repos.length > 0 && (
        <Card className="border-border bg-card/40 backdrop-blur-xl shadow-elevated">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5 text-primary" /> Public Repositories
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 divide-y divide-white/5">
            {repos.map((repo) => (
              <div key={repo.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    {repo.name} <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{repo.description || "No description"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {repo.language && <Badge variant="outline" className="text-[10px]">{repo.language}</Badge>}
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" />{repo.stargazers_count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
