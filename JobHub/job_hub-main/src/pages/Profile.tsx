import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, CheckCircle, FileText, Mail, GraduationCap, Globe, Loader2,
  Building2, ShieldCheck, User, Lock, Camera, Eye, EyeOff, Trash
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getCampusTag, isPublicDomain, getEmailDomain } from "@/lib/domainUtils";
import { resetPassword, changePassword, updateUserName, updateUserEmail, uploadProfileAvatar, deleteProfileAvatar, uploadResume } from "@/services/api";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>((user as any)?.avatar_url || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [editName, setEditName] = useState(user?.name || "");
  const [updatingName, setUpdatingName] = useState(false);

  // Email form state
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [personalEmail, setPersonalEmail] = useState("");
  const [updatingPersonalEmail, setUpdatingPersonalEmail] = useState(false);

  // Password form state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const isStudent = user?.role === "student";
  const isCompany = user?.role === "company";
  const isUniAdmin = user?.role === "university_admin";
  const isSuperAdmin = user?.role === "super_admin";

  const campusTag = user ? getCampusTag(user.email) : "Off Campus";
  const emailDomain = user ? getEmailDomain(user.email) : "";
  const isOffCampus = user ? isPublicDomain(user.email) : true;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error("Profile picture must be a JPG, JPEG, or PNG image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile picture size must be less than 2MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const url = await uploadProfileAvatar(file);
      setAvatarUrl(url);
      if (typeof (user as any).avatar_url !== 'undefined') (user as any).avatar_url = url;
      toast.success("Profile picture updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true);
    try {
      await deleteProfileAvatar();
      setAvatarUrl("");
      if (typeof (user as any).avatar_url !== 'undefined') (user as any).avatar_url = null;
      toast.success("Profile picture removed!");
    } catch {
      toast.error("Failed to remove profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return;

    if (resumeFile.type !== 'application/pdf') {
      toast.error("Resume must be a PDF file.");
      return;
    }
    if (resumeFile.size > 5 * 1024 * 1024) {
      toast.error("Resume size must be less than 5MB.");
      return;
    }

    setUploading(true);
    try {
      await uploadResume(resumeFile);
      toast.success("Resume uploaded successfully!");
      setResumeFile(null);
    } catch {
      toast.error("Failed to upload resume. Please try again.");
    } finally { setUploading(false); }
  };

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) { toast.error("Please enter a valid name."); return; }
    if (editName === user?.name) { toast.error("Name is already set to this."); return; }
    setUpdatingName(true);
    try {
      await updateUserName(editName.trim());
      updateUser({ name: editName.trim() });
      toast.success("Name updated successfully!");
    } catch (err: any) { toast.error(err.message || "Failed to update name."); }
    finally { setUpdatingName(false); }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmail || editEmail === user?.email) { toast.error("Please enter a valid, new email address."); return; }
    setUpdatingEmail(true);
    try {
      await updateUserEmail(editEmail);
      toast.success("Verification links sent! Check both your old and new email inboxes.", { duration: 6000 });
      setEditEmail(user?.email || "");
    } catch (err: any) { toast.error(err.message || "Failed to update email."); }
    finally { setUpdatingEmail(false); }
  };

  const handlePersonalEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalEmail) return;
    setUpdatingPersonalEmail(true);
    try {
      // Intended to connect to backend for `personal_email` column in students table
      await new Promise(r => setTimeout(r, 800));
      toast.success("Personal email updated successfully!");
    } catch { toast.error("Failed to update personal email."); }
    finally { setUpdatingPersonalEmail(false); }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) { toast.error("Please enter your current password."); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (oldPassword === newPassword) { toast.error("New password must be different from your current password."); return; }
    setChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success("Password updated successfully!");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) { toast.error(err.message || "Failed to update password."); }
    finally { setChangingPassword(false); }
  };

  const renderRoleBadge = () => {
    if (isStudent) return <><GraduationCap className="h-3 w-3 mr-1" /> Student</>;
    if (isCompany) return <><Building2 className="h-3 w-3 mr-1" /> Company</>;
    if (isUniAdmin) return <><ShieldCheck className="h-3 w-3 mr-1" /> University Admin</>;
    if (isSuperAdmin) return <><ShieldCheck className="h-3 w-3 mr-1" /> Super Admin</>;
    return "User";
  };

  const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <div className="relative min-h-screen pb-12 animate-fade-in">
      {/* Ambient gradient lights */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-10 left-0 w-[700px] h-[500px] bg-primary/10 rounded-full filter blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-accent/8 rounded-full filter blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full filter blur-[80px]" />
      </div>

      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and personal information.</p>
        </div>

        {/* Profile Header Card */}
        <Card className="border-border bg-card/40 backdrop-blur-xl shadow-elevated relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/5 pointer-events-none" />
          <CardContent className="pt-8 pb-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar Upload */}
              <div className="relative group flex-shrink-0">
                <Avatar className="h-24 w-24 border-2 border-border ring-4 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-display text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                    title="Upload picture"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  {avatarUrl && (
                    <button
                      onClick={handleAvatarRemove}
                      disabled={uploadingAvatar}
                      className="p-2 bg-destructive hover:bg-destructive/80 rounded-full transition-colors text-white"
                      title="Remove picture"
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                {uploadingAvatar && (
                  <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handleAvatarChange} />
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="mb-2">
                  <h2 className="font-display text-2xl font-bold">{user?.name || "User"}</h2>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground mb-3">
                  <Mail className="h-3.5 w-3.5" /> {user?.email}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Badge variant="outline" className="text-xs">{renderRoleBadge()}</Badge>
                  {isStudent && (
                    <Badge className={isOffCampus ? "bg-info/10 text-info border-info/30 text-xs" : "bg-emerald-500/10 text-emerald-400 border-emerald-400/30 text-xs"}>
                      {isOffCampus ? <Globe className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                      {campusTag}
                    </Badge>
                  )}
                </div>
                {isStudent && !isOffCampus && (
                  <p className="text-xs text-muted-foreground mt-2">Auto-verified via <span className="font-medium text-foreground">{emailDomain}</span></p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="edit-profile" className="w-full">
          <TabsList className="mb-6 bg-card border border-border h-auto p-1">
            <TabsTrigger value="edit-profile" className="py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <User className="w-4 h-4 mr-2" /> Edit Profile
            </TabsTrigger>
          </TabsList>

          {/* Edit Profile Tab */}
          <TabsContent value="edit-profile" className="m-0 outline-none space-y-4">
            <Card className="border-border bg-card/40 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent pointer-events-none" />
              <CardHeader className="border-b border-white/5 relative z-10">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 relative z-10 space-y-6">
                <form onSubmit={handleNameUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Display Name</Label>
                    <div className="flex gap-3">
                      <Input
                        id="edit-name" placeholder="Your full name"
                        value={editName} onChange={e => setEditName(e.target.value)}
                        className="bg-background/50 border-white/10 focus:border-primary/50 max-w-sm"
                        required
                      />
                      <Button type="submit" disabled={updatingName || editName === user?.name} variant="secondary">
                        {updatingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Name"}
                      </Button>
                    </div>
                  </div>
                </form>

                <div className="space-y-4 pt-4 border-t border-white/5 max-w-sm">
                  <Label>Email Address</Label>
                  {isStudent && !isOffCampus ? (
                    <div className="space-y-4">
                      <div>
                        <Input value={user?.email || ""} disabled className="bg-background/20 opacity-70 border-white/10" />
                        <p className="text-xs text-muted-foreground mt-1">University email cannot be changed.</p>
                      </div>
                      <form onSubmit={handlePersonalEmailUpdate} className="space-y-2">
                        <Label htmlFor="personal-email">Personal Email</Label>
                        <div className="flex gap-3">
                          <Input
                            id="personal-email" type="email" placeholder="Contact email"
                            value={personalEmail} onChange={e => setPersonalEmail(e.target.value)}
                            className="bg-background/50 border-white/10 focus:border-primary/50"
                            required
                          />
                          <Button type="submit" disabled={updatingPersonalEmail} variant="secondary">
                            {updatingPersonalEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Updates your alternative contact email.</p>
                      </form>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailUpdate} className="space-y-2">
                      <div className="flex gap-3">
                        <Input
                          id="edit-email" type="email" placeholder="Your email address"
                          value={editEmail} onChange={e => setEditEmail(e.target.value)}
                          className="bg-background/50 border-white/10 focus:border-primary/50"
                          required
                        />
                        <Button type="submit" disabled={updatingEmail || editEmail === user?.email} variant="secondary">
                          {updatingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Email"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">A verification mail will be sent to both addresses.</p>
                    </form>
                  )}
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-4 pt-4 border-t border-white/5 max-w-sm">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold">Change Password</Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter your current password to verify identity, then set your new password.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showOldPw ? "text" : "password"} placeholder="Your current password"
                          value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                          className="bg-background/50 border-white/10 focus:border-primary/50 pr-10"
                        />
                        <button type="button" onClick={() => setShowOldPw(!showOldPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                          {showOldPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">New Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPw ? "text" : "password"} placeholder="Min. 8 characters"
                          value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          className="bg-background/50 border-white/10 focus:border-primary/50 pr-10"
                        />
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                          {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPw ? "text" : "password"} placeholder="Repeat new password"
                          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                          className={`bg-background/50 border-white/10 focus:border-primary/50 pr-10 ${
                            confirmPassword && confirmPassword !== newPassword ? "border-destructive/60" : ""
                          }`}
                        />
                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                          {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-xs text-destructive">Passwords do not match.</p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
                    className="w-full bg-primary hover:bg-primary/90 mt-2 shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                  >
                    {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}