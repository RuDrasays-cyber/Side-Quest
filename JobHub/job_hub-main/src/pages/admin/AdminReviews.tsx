import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MessageSquareQuote, GraduationCap, Building2, Globe, Loader2, CheckCircle2, XCircle, Clock, Trash2, Ban, Reply, Send } from "lucide-react";
import { fetchAdminReviews, updateReviewStatus, adminDeleteReview, banReviewUser, unbanReviewUser, fetchBannedUsers, replyToReview, type ReviewData } from "@/services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [data, banned] = await Promise.all([fetchAdminReviews(), fetchBannedUsers()]);
        setReviews(data);
        setBannedUsers(banned);
      } catch { toast.error("Failed to load reviews or banned users."); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected") => {
    setUpdatingId(id);
    try {
      await updateReviewStatus(id, status);
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast.success(status === "approved" ? "Review approved — it will now appear on the landing page!" : "Review rejected — it won't be displayed publicly.");
    } catch { toast.error("Failed to update review status."); }
    finally { setUpdatingId(null); }
  };

  const handleAdminDelete = async (reviewId: string, authorId?: string) => {
    if (!confirm("Are you sure you want to permanently delete this review? A violation notification will be sent to the user.")) return;
    setUpdatingId(reviewId);
    try {
      await adminDeleteReview(reviewId, authorId || "");
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success("Review deleted successfully.");
    } catch { toast.error("Failed to delete review."); }
    finally { setUpdatingId(null); }
  };

  const handleToggleBan = async (profileId?: string, isBanned?: boolean) => {
    if (!profileId) { toast.error("Cannot toggle: Unknown user."); return; }
    
    setUpdatingId(profileId); // temporarily hijack updatingId for locking buttons
    try {
      if (isBanned) {
        if (!confirm("Are you sure you want to lift the ban for this user?")) return;
        await unbanReviewUser(profileId);
        toast.success("User unbanned successfully.");
      } else {
        if (!confirm("Are you sure you want to ban this user from writing reviews for 42 hours?")) return;
        await banReviewUser(profileId);
        toast.success("User banned successfully!");
      }

      setReviews(prev => prev.map(r => r.profile_id === profileId ? { ...r, is_author_banned: !isBanned } : r));
      const banned = await fetchBannedUsers();
      setBannedUsers(banned);
    } catch { toast.error("Failed to update ban status."); }
    finally { setUpdatingId(null); }
  };

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) { toast.error("Reply cannot be empty."); return; }
    setUpdatingId(reviewId);
    try {
      await replyToReview(reviewId, replyText.trim());
      setReviews(prev => prev.map(r =>
        r.id === reviewId
          ? { ...r, admin_reply: replyText.trim(), admin_replied_at: new Date().toLocaleDateString() }
          : r
      ));
      setReplyingId(null);
      setReplyText("");
      toast.success("Reply sent! The user will be notified.");
    } catch { toast.error("Failed to send reply."); }
    finally { setUpdatingId(null); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading feedback records...</p>
      </div>
    );
  }

  const renderStars = (rating: number) => Array.from({ length: 5 }).map((_, i) => (
    <Star key={i} className={`h-4 w-4 ${i < rating ? "text-warning fill-warning" : "text-white/10"}`} />
  ));

  const getRoleIcon = (role: string) => {
    if (role === "student") return <GraduationCap className="h-4 w-4" />;
    if (role === "company") return <Building2 className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  const getRoleColor = (role: string) => {
    if (role === "student") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    if (role === "company") return "text-primary bg-primary/10 border-primary/30";
    return "text-warning bg-warning/10 border-warning/30";
  };

  const statusConfig = {
    pending: { icon: Clock, label: "Pending", className: "text-warning border-warning/30 bg-warning/10" },
    approved: { icon: CheckCircle2, label: "Approved", className: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
    rejected: { icon: XCircle, label: "Rejected", className: "text-destructive border-destructive/30 bg-destructive/10" },
  };

  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const pending = reviews.filter(r => r.status === "pending");
  const approved = reviews.filter(r => r.status === "approved");
  const rejected = reviews.filter(r => r.status === "rejected");

  const renderReviewCard = (review: ReviewData) => {
    const cfg = statusConfig[review.status];
    const isUpdating = updatingId === review.id;
    return (
      <Card key={review.id} className="border-border bg-card/40 backdrop-blur-md group relative overflow-hidden transition-all hover:border-primary/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <CardHeader className="pb-3 border-b border-white/5 relative z-10">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div className="flex gap-1">{renderStars(review.rating)}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`capitalize flex items-center gap-1.5 text-xs ${getRoleColor(review.role)}`}>
                {getRoleIcon(review.role)} {review.role}
              </Badge>
              <Badge variant="outline" className={`capitalize flex items-center gap-1.5 text-xs ${cfg.className}`}>
                <cfg.icon className="h-3 w-3" /> {cfg.label}
              </Badge>
            </div>
          </div>
          <div className="pt-4 flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-white/10 shrink-0">
              <AvatarImage src={review.avatar_url} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold uppercase">
                {review.author.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-base font-display">{review.author}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-4 relative z-10 space-y-4">
          <p className="text-sm text-foreground/80 italic leading-relaxed">"{review.content}"</p>
          <p className="text-xs text-muted-foreground">Posted {review.date}</p>

          {/* Existing admin reply display */}
          {review.admin_reply && (
            <div className="ml-3 pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg py-2.5 pr-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Reply className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Your Reply</span>
                {review.admin_replied_at && (
                  <span className="text-[10px] text-muted-foreground ml-auto">{review.admin_replied_at}</span>
                )}
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed">{review.admin_reply}</p>
            </div>
          )}

          {/* Reply button / textarea */}
          {replyingId === review.id ? (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                rows={3}
                placeholder="Write your reply to this review..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs"
                  disabled={isUpdating || !replyText.trim()}
                  onClick={() => handleReply(review.id)}
                >
                  {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  Send Reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-xs"
                  onClick={() => { setReplyingId(null); setReplyText(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full border-primary/20 text-primary hover:bg-primary/5 text-xs mt-1"
              onClick={() => { setReplyingId(review.id); setReplyText(review.admin_reply || ""); }}
            >
              <Reply className="h-3.5 w-3.5 mr-1" />
              {review.admin_reply ? "Edit Reply" : "Reply to Review"}
            </Button>
          )}

          {review.status === "pending" && (
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <Button
                size="sm"
                className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-400/30"
                disabled={isUpdating}
                onClick={() => handleStatusUpdate(review.id, "approved")}
              >
                {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/5"
                disabled={isUpdating}
                onClick={() => handleStatusUpdate(review.id, "rejected")}
              >
                {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                Reject
              </Button>
            </div>
          )}
          {review.status === "approved" && (
            <Button size="sm" variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 text-xs" disabled={isUpdating} onClick={() => handleStatusUpdate(review.id, "rejected")}>
              Revoke Approval
            </Button>
          )}
          {review.status === "rejected" && (
            <Button size="sm" className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 text-xs" disabled={isUpdating} onClick={() => handleStatusUpdate(review.id, "approved")}>
              Approve After All
            </Button>
          )}

          <div className="flex gap-2 pt-2 border-t border-white/5">
            <Button size="sm" variant="outline" className="flex-1 opacity-80 hover:opacity-100 hover:bg-destructive/10 text-destructive border-transparent hover:border-destructive/30 text-xs transition-colors" disabled={isUpdating} onClick={() => handleAdminDelete(review.id, review.profile_id)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
            <Button size="sm" variant="outline" className={`flex-1 opacity-80 hover:opacity-100 text-xs transition-colors ${review.is_author_banned ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50" : "hover:bg-destructive/20 text-white bg-destructive/10 border-destructive/20 hover:border-destructive/50"}`} disabled={isUpdating || updatingId === review.profile_id} onClick={() => handleToggleBan(review.profile_id, review.is_author_banned)}>
              {review.is_author_banned ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Unban User</> : <><Ban className="h-3.5 w-3.5 mr-1" /> Ban User</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8 relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-primary/8 rounded-full filter blur-[100px]" />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display leading-none text-3xl font-bold tracking-tight mb-2">Platform Reviews</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4" /> Moderate user feedback before it appears on the landing page.
          </p>
        </div>
        <div className="bg-card/40 border border-border px-4 py-2 rounded-xl flex items-center gap-3">
          <div className="flex">{renderStars(Math.round(parseFloat(avgRating)))}</div>
          <span className="font-bold text-lg">{avgRating}</span>
          <span className="text-sm text-muted-foreground">({reviews.length} total)</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", count: pending.length, color: "text-warning" },
          { label: "Approved", count: approved.length, color: "text-emerald-400" },
          { label: "Rejected", count: rejected.length, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label} className="border-border bg-card/30 text-center">
            <CardContent className="pt-5 pb-4">
              <p className={`text-3xl font-black font-display ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6 bg-card border border-border h-auto p-1">
          <TabsTrigger value="all" className="py-2.5 px-5 data-[state=active]:bg-primary rounded-lg">
            All <span className="ml-1.5 text-xs opacity-70">({reviews.length})</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="py-2.5 px-5 data-[state=active]:bg-primary rounded-lg">
            Pending <span className="ml-1.5 text-xs opacity-70">({pending.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="py-2.5 px-5 data-[state=active]:bg-primary rounded-lg">
            Approved <span className="ml-1.5 text-xs opacity-70">({approved.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="py-2.5 px-5 data-[state=active]:bg-primary rounded-lg">
            Rejected <span className="ml-1.5 text-xs opacity-70">({rejected.length})</span>
          </TabsTrigger>
          <TabsTrigger value="banned_users" className="py-2.5 px-5 data-[state=active]:bg-primary rounded-lg text-destructive">
            Banned Users <span className="ml-1.5 text-xs opacity-70">({bannedUsers.length})</span>
          </TabsTrigger>
        </TabsList>

        {[
          { value: "all", data: reviews },
          { value: "pending", data: pending },
          { value: "approved", data: approved },
          { value: "rejected", data: rejected },
          { value: "banned_users", data: bannedUsers },
        ].map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="m-0">
            {tab.value === "banned_users" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bannedUsers.map(u => (
                  <Card key={u.id} className="border-destructive/30 bg-destructive/5 backdrop-blur-md relative overflow-hidden">
                    <CardHeader className="pb-3 border-b border-white/5 relative z-10 flex flex-row items-center gap-3 space-y-0">
                      <Avatar className="h-10 w-10 border border-white/10 shrink-0">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold uppercase">{u.name?.substring(0, 2) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base font-display">{u.name || "Unknown"}</CardTitle>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 pb-4 relative z-10 space-y-4">
                       <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-xs mb-2 block w-fit">Banned Until: {new Date(u.banned_until).toLocaleDateString()}</Badge>
                       <Button size="sm" variant="outline" className="w-full text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-xs" disabled={updatingId === u.id} onClick={() => handleToggleBan(u.id, true)}>
                         {updatingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />} Revoke Ban
                       </Button>
                    </CardContent>
                  </Card>
                ))}
                {bannedUsers.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-20 text-emerald-400" />
                    No banned users found.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tab.data.map(r => renderReviewCard(r))}
                {tab.data.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl">
                    <MessageSquareQuote className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    No reviews in this category.
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
