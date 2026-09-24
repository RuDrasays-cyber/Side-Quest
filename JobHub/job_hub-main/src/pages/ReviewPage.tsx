import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MessageSquarePlus, CheckCircle2, Clock, XCircle, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { submitReview, fetchMyReviews, deleteReview, type ReviewData } from "@/services/api";

export default function ReviewPage() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [myReviews, setMyReviews] = useState<ReviewData[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMyReviews();
        setMyReviews(data);
      } catch { /* silently fail if table not yet created */ }
      finally { setLoadingReviews(false); }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { toast.error("Please select a star rating."); return; }
    if (content.trim().length < 10) { toast.error("Please write at least 10 characters."); return; }
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 120) { toast.error("Review exceeds the 120-word limit. Please shorten your feedback."); return; }
    setSubmitting(true);
    try {
      await submitReview(content.trim(), rating);
      toast.success("Review submitted successfully!");
      const newReview: ReviewData = {
        id: Date.now().toString(), author: user?.name || "You",
        role: user?.role || "student", content: content.trim(),
        rating, status: "pending", date: new Date().toLocaleDateString(),
      };
      setMyReviews(prev => [newReview, ...prev]);
      setContent(""); setRating(0);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review.");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      await deleteReview(id);
      setMyReviews(prev => prev.filter(r => r.id !== id));
      toast.success("Review deleted successfully.");
    } catch { toast.error("Failed to delete review."); }
  };

  const statusConfig = {
    pending: { icon: Clock, label: "Pending Review", className: "text-warning border-warning/30 bg-warning/10" },
    approved: { icon: CheckCircle2, label: "Approved", className: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
    rejected: { icon: XCircle, label: "Not Approved", className: "text-destructive border-destructive/30 bg-destructive/10" },
  };

  return (
    <div className="relative min-h-screen space-y-10 pb-12 animate-fade-in">
      {/* Ambient gradient lights */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-primary/15 rounded-full filter blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-accent/10 rounded-full filter blur-[100px]" />
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Share Your Experience</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Your feedback helps us improve JobHub for everyone.
        </p>
      </div>

      {/* Write Review Card */}
      <Card className="border-border bg-card/40 backdrop-blur-xl shadow-elevated relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <CardHeader className="border-b border-white/5 relative z-10">
          <CardTitle className="font-display flex items-center gap-2 text-xl">
            <Star className="h-5 w-5 text-warning" /> Write a Review
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80">Your Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="focus:outline-none transition-transform hover:scale-110"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`h-8 w-8 transition-colors duration-150 ${
                        star <= (hoverRating || rating)
                          ? "text-warning fill-warning drop-shadow-[0_0_6px_hsl(var(--warning)/0.7)]"
                          : "text-white/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-xs text-muted-foreground">
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]} — {rating} out of 5 stars
                </p>
              )}
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80">Your Review</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tell us about your experience with JobHub (max 120 words) — what worked well, what could be improved..."
                rows={5}
                className="bg-background/50 border-white/10 resize-none focus:border-primary/50 transition-colors"
                maxLength={2000}
              />
              <div className="flex justify-between items-center text-xs mt-1">
                <span className={content.trim().split(/\s+/).filter(Boolean).length > 120 ? "text-destructive font-bold" : "text-muted-foreground"}>
                  {content.trim().split(/\s+/).filter(Boolean).length} / 120 words
                </span>
                <span className="text-muted-foreground">{content.length} characters</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || rating === 0 || content.trim().length < 10 || content.trim().split(/\s+/).filter(Boolean).length > 120}
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-all"
            >
              {submitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                : <><Send className="mr-2 h-4 w-4" /> Submit Review</>
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Reviews */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold tracking-tight">My Previous Reviews</h2>
        {loadingReviews ? (
          <div className="flex items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your reviews...
          </div>
        ) : myReviews.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl text-muted-foreground">
            <MessageSquarePlus className="h-10 w-10 mx-auto mb-3 opacity-20" />
            You haven't written any reviews yet. Share your experience above!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {myReviews.map((r) => {
              const cfg = statusConfig[r.status];
              return (
                <Card key={r.id} className="border-border bg-card/30 backdrop-blur-md relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                  <CardContent className="pt-5 pb-5 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "fill-warning text-warning" : "text-white/10"}`} />
                        ))}
                      </div>
                      <Badge variant="outline" className={`capitalize flex items-center gap-1.5 text-xs font-medium ${cfg.className}`}>
                        <cfg.icon className="h-3 w-3" /> {cfg.label}
                      </Badge>
                    </div>

                    <div className="flex items-start gap-4 mb-4 pb-4 border-b border-white/5">
                      <Avatar className="h-10 w-10 border border-white/10 shrink-0">
                        <AvatarImage src={r.avatar_url} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold uppercase">
                          {r.author.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-none mb-1">{r.author}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{r.role}</p>
                      </div>
                    </div>

                    <p className="text-sm text-foreground/80 italic leading-relaxed">"{r.content}"</p>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter">{r.date}</p>
                      
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                    
                    {r.status === "rejected" && (
                      <p className="text-xs text-muted-foreground/60 mt-1 italic">
                        This review was not approved for public display, but remains visible here.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
