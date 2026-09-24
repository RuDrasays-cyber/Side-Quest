import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, BookOpen, Upload, FileText, Loader2, Pencil,
  Trash2, Plus, X, CheckCircle2, AlertTriangle, Save, Eye,
  GitBranch, ExternalLink, Star
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchStudentProfile,
  updateStudentProfile,
  clearStudentProfile,
  uploadResume,
  fetchGitHubRepos,
  updateGitHubUsername,
  type StudentProfile as StudentProfileType,
  type GitHubRepo,
} from "@/services/api";

export default function StudentProfile() {
  const { user } = useAuth();
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<StudentProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [cgpa, setCgpa] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [isOnCampus, setIsOnCampus] = useState<boolean | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const data = await fetchStudentProfile();
    setProfile(data);
    if (data) {
      setCgpa(data.cgpa?.toString() || "");
      setSkills(data.skills || []);
      setIsOnCampus(data.is_on_campus);
      // If profile has no data filled, go straight to edit mode
      if (!data.cgpa && (!data.skills || data.skills.length === 0) && !data.resume_url && data.is_on_campus === null) {
        setEditing(true);
      }
    }
    setLoading(false);

    // Load GitHub repos from user profile
    try {
      const { data: profileData } = await (await import("@/services/api")).supabase.auth.getSession();
      if (profileData?.session?.user) {
        const user = profileData.session.user;
        const { data: pf } = await (await import("@/services/api")).supabase
          .from('profiles').select('github_username').eq('id', user.id).single();
          
        let targetUsername = pf?.github_username;
        
        // Auto-detect if logged in natively via GitHub OAuth
        if (!targetUsername && user.app_metadata?.provider === 'github') {
          targetUsername = user.user_metadata?.user_name || user.user_metadata?.preferred_username;
        }

        if (targetUsername) {
          setGithubUsername(targetUsername);
          setLoadingRepos(true);
          const r = await fetchGitHubRepos(targetUsername);
          setRepos(r);
          setLoadingRepos(false);
        }
      }
    } catch { /* no github username set */ }
  };

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const skill = skillInput.trim();
      if (skill && !skills.includes(skill) && skills.length < 20) {
        setSkills([...skills, skill]);
        setSkillInput("");
      }
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    setUploading(true);
    try {
      const result = await uploadResume(resumeFile);
      const url = typeof result === 'string' ? result : result.url;
      await updateStudentProfile({ resume_url: url });
      toast.success("Resume uploaded successfully!");
      setResumeFile(null);
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload resume.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const cgpaNum = cgpa ? parseFloat(cgpa) : null;
    if (cgpaNum !== null && (cgpaNum < 0 || cgpaNum > 10)) {
      toast.error("CGPA must be between 0 and 10.");
      return;
    }
    setSaving(true);
    try {
      await updateStudentProfile({
        cgpa: cgpaNum,
        skills,
        is_on_campus: isOnCampus,
      });
      toast.success("Profile updated successfully!");
      setEditing(false);
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearProfile = async () => {
    setDeleting(true);
    try {
      await clearStudentProfile();
      toast.success("Profile data cleared.");
      setCgpa("");
      setSkills([]);
      setIsOnCampus(null);
      setEditing(true);
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to clear profile.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your profile...
      </div>
    );
  }

  const hasData = profile && (profile.cgpa !== null || (profile.skills && profile.skills.length > 0) || profile.resume_url || profile.is_on_campus !== null);

  return (
    <div className="relative min-h-screen pb-12 animate-fade-in">
      {/* Ambient gradient lights */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-10 left-0 w-[700px] h-[500px] bg-primary/10 rounded-full filter blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-accent/8 rounded-full filter blur-[100px]" />
      </div>

      <div className="max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Your Profile</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Build your placement profile — CGPA, skills, resume, and campus status.
            </p>
          </div>
          {hasData && !editing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="border-border">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearProfile}
                disabled={deleting}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Clear Profile
              </Button>
            </div>
          )}
        </div>

        {/* View Mode */}
        {hasData && !editing && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* CGPA Card */}
            <Card className="border-border bg-card/40 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <CardContent className="pt-6 pb-6 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">CGPA</p>
                </div>
                <p className="text-4xl font-display font-bold text-foreground">
                  {profile?.cgpa !== null ? profile?.cgpa?.toFixed(2) : "—"}
                  <span className="text-lg text-muted-foreground font-normal"> / 10</span>
                </p>
              </CardContent>
            </Card>

            {/* Campus Status Card */}
            <Card className="border-border bg-card/40 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
              <CardContent className="pt-6 pb-6 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                    <GraduationCap className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Campus Status</p>
                </div>
                {profile?.is_on_campus !== null ? (
                  <Badge className={`text-sm px-3 py-1 ${profile?.is_on_campus
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                  }`}>
                    {profile?.is_on_campus ? "On Campus" : "Off Campus"}
                  </Badge>
                ) : (
                  <p className="text-muted-foreground">Not set</p>
                )}
              </CardContent>
            </Card>

            {/* Skills Card */}
            <Card className="border-border bg-card/40 backdrop-blur-xl relative overflow-hidden md:col-span-2">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent pointer-events-none" />
              <CardHeader className="border-b border-white/5 relative z-10">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 relative z-10">
                {profile?.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-sm px-3 py-1 border-primary/20 text-primary bg-primary/5">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No skills added yet.</p>
                )}
              </CardContent>
            </Card>


            {/* Resume Card */}
            <Card className="border-border bg-card/40 backdrop-blur-xl relative overflow-hidden md:col-span-2">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/3 to-transparent pointer-events-none" />
              <CardHeader className="border-b border-white/5 relative z-10">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Resume
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 relative z-10 space-y-4">
                {profile?.resume_url ? (
                  <div className="flex items-center justify-between p-4 border border-white/10 rounded-xl bg-background/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Resume uploaded</p>
                        <p className="text-xs text-muted-foreground">Click to view or re-upload below</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-border">
                      <a href={profile.resume_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="mr-2 h-4 w-4" /> View
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No resume uploaded yet.</p>
                )}
                {/* Upload section always visible */}
                <label htmlFor="resume-pick" className="block border-2 border-dashed border-white/10 hover:border-primary/40 rounded-xl p-8 text-center cursor-pointer transition-colors group">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                  <p className="text-sm text-muted-foreground mb-1">{profile?.resume_url ? "Re-upload your resume" : "Upload your resume"}</p>
                  <p className="text-xs text-muted-foreground/60">PDF only — Max 5MB</p>
                  <Input
                    id="resume-pick" type="file" accept=".pdf"
                    className="hidden" onChange={e => setResumeFile(e.target.files?.[0] || null)}
                    ref={resumeInputRef} disabled={uploading}
                  />
                </label>
                {resumeFile && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> {resumeFile.name}
                    </p>
                    <Button onClick={handleResumeUpload} disabled={uploading} size="sm" className="bg-primary hover:bg-primary/90">
                      {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />Upload</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Mode */}
        {(editing || !hasData) && (
          <Card className="border-border bg-card/40 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="border-b border-white/5 relative z-10">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" /> {hasData ? "Edit Your Profile" : "Set Up Your Profile"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 relative z-10 space-y-6">
              {/* CGPA */}
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="cgpa" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> CGPA
                </Label>
                <Input
                  id="cgpa" type="number" step="0.01" min="0" max="10"
                  placeholder="e.g. 8.50"
                  value={cgpa} onChange={e => setCgpa(e.target.value)}
                  className="bg-background/50 border-white/10 focus:border-primary/50"
                />
                <p className="text-xs text-muted-foreground">Enter your current CGPA (0.00 – 10.00)</p>
              </div>

              {/* Campus Status */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" /> Campus Status
                </Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={isOnCampus === true ? "default" : "outline"}
                    onClick={() => setIsOnCampus(true)}
                    className={`${isOnCampus === true ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-white/10"}`}
                  >
                    On Campus
                  </Button>
                  <Button
                    type="button"
                    variant={isOnCampus === false ? "default" : "outline"}
                    onClick={() => setIsOnCampus(false)}
                    className={`${isOnCampus === false ? "bg-orange-600 hover:bg-orange-700 text-white" : "border-white/10"}`}
                  >
                    Off Campus
                  </Button>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Skills
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-sm px-3 py-1 border-primary/20 text-primary bg-primary/5 flex items-center gap-1.5">
                      {skill}
                      <button onClick={() => handleRemoveSkill(skill)} className="hover:text-destructive transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 max-w-md">
                  <Input
                    placeholder="Type a skill and press Enter"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    className="bg-background/50 border-white/10 focus:border-primary/50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const skill = skillInput.trim();
                      if (skill && !skills.includes(skill) && skills.length < 20) {
                        setSkills([...skills, skill]);
                        setSkillInput("");
                      }
                    }}
                    className="border-white/10 shrink-0"
                    disabled={!skillInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{skills.length}/20 skills added</p>
              </div>

              {/* Resume Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Resume
                </Label>
                <label htmlFor="resume-edit" className="block border-2 border-dashed border-white/10 hover:border-primary/40 rounded-xl p-8 text-center cursor-pointer transition-colors group">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                  <p className="text-sm text-muted-foreground mb-1">Click to upload your resume</p>
                  <p className="text-xs text-muted-foreground/60">PDF only — Max 5MB</p>
                  <Input
                    id="resume-edit" type="file" accept=".pdf"
                    className="hidden" onChange={e => setResumeFile(e.target.files?.[0] || null)}
                    disabled={uploading}
                  />
                </label>
                {resumeFile && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> {resumeFile.name}
                    </p>
                    <Button onClick={handleResumeUpload} disabled={uploading} size="sm" className="bg-primary hover:bg-primary/90">
                      {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />Upload</>}
                    </Button>
                  </div>
                )}
                {profile?.resume_url && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Resume already on file. Upload a new one to replace it.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/5">
                <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Profile
                </Button>
                {hasData && (
                  <Button variant="outline" onClick={() => setEditing(false)} className="border-border">
                    Cancel
                  </Button>
                )}
              </div>

              {hasData && (
                <div className="pt-4 border-t border-white/5">
                  <Button
                    variant="ghost"
                    onClick={handleClearProfile}
                    disabled={deleting}
                    className="text-destructive hover:bg-destructive/10 text-sm"
                  >
                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                    Clear All Profile Data
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">This will remove your CGPA, skills, resume, and campus status from the database.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* GitHub Repos Card - Always Rendered */}
        <Card className="border-border bg-card/40 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent pointer-events-none" />
          <CardHeader className="border-b border-white/5 relative z-10">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" /> GitHub Repositories
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 relative z-10 space-y-3">
            {!githubUsername && (
              <div className="flex items-center gap-2">
                <Input placeholder="Enter your GitHub username" className="max-w-xs bg-background/50 border-white/10"
                  value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} />
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!githubUsername.trim()) return;
                  setLoadingRepos(true);
                  try {
                    await updateGitHubUsername(githubUsername.trim());
                    const r = await fetchGitHubRepos(githubUsername.trim());
                    setRepos(r);
                    toast.success("GitHub linked!");
                  } catch { toast.error("Failed to fetch repos."); }
                  finally { setLoadingRepos(false); }
                }}>
                  <GitBranch className="mr-1.5 h-3.5 w-3.5" /> Link
                </Button>
              </div>
            )}
            {loadingRepos && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading repos...</div>}
            {githubUsername && repos.length === 0 && !loadingRepos && (
              <p className="text-sm text-muted-foreground">No public repositories found for @{githubUsername}</p>
            )}
            {repos.length > 0 && (
              <div className="divide-y divide-white/5">
                {repos.slice(0, 8).map((repo) => (
                  <div key={repo.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                        {repo.name} <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{repo.description || "No description"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {repo.language && <Badge variant="outline" className="text-[10px] py-0">{repo.language}</Badge>}
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Star className="h-3 w-3" />{repo.stargazers_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
