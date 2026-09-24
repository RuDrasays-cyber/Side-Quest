import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  ArrowLeft,
  MessageSquareQuote,
  Loader2,
  GraduationCap,
  Building2,
  Globe,
  ChevronDown,
  Reply,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";
import {
  fetchPublicReviewsPaginated,
  type ReviewData,
  type ReviewCategory,
} from "@/services/api";

const CATEGORIES: { key: ReviewCategory; label: string; description: string; color: string }[] = [
  { key: "all", label: "All Reviews", description: "Every review", color: "text-white" },
  { key: "critical", label: "Critical", description: "Rating 0–1", color: "text-red-400" },
  { key: "good", label: "Good", description: "Rating 2–3", color: "text-amber-400" },
  { key: "better", label: "Better", description: "Rating 4", color: "text-emerald-400" },
  { key: "best", label: "Best", description: "Rating 5", color: "text-primary" },
];

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const getRoleIcon = (role: string) => {
  if (role === "student") return <GraduationCap className="h-3.5 w-3.5" />;
  if (role === "company") return <Building2 className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
};

const getRoleBadgeClass = (role: string) => {
  if (role === "student") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
  if (role === "company") return "text-primary bg-primary/10 border-primary/30";
  return "text-warning bg-warning/10 border-warning/30";
};

const getCategoryBadge = (rating: number) => {
  if (rating <= 1) return { label: "Critical", className: "text-red-400 bg-red-400/10 border-red-400/30" };
  if (rating <= 3) return { label: "Good", className: "text-amber-400 bg-amber-400/10 border-amber-400/30" };
  if (rating === 4) return { label: "Better", className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" };
  return { label: "Best", className: "text-primary bg-primary/10 border-primary/30" };
};

function ReviewCard({ review, index }: { review: ReviewData; index: number }) {
  const cat = getCategoryBadge(review.rating);
  return (
    <Card
      className="border border-white/5 bg-card/30 backdrop-blur-md shadow-lg rounded-3xl group relative overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-primary/5 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardContent className="p-8 relative z-10">
        {/* Header: Stars + Category Badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < review.rating ? "fill-warning text-warning" : "text-white/10"}`}
              />
            ))}
          </div>
          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold ${cat.className}`}>
            {cat.label}
          </Badge>
        </div>

        {/* Review Text */}
        <p className="text-white/70 leading-relaxed mb-6 font-light italic text-sm">
          "{review.content}"
        </p>

        {/* Admin Reply */}
        {review.admin_reply && (
          <div className="mb-6 ml-4 pl-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-xl py-3 pr-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Reply className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Admin Response</span>
              {review.admin_replied_at && (
                <span className="text-[10px] text-white/30 ml-auto">{review.admin_replied_at}</span>
              )}
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{review.admin_reply}</p>
          </div>
        )}

        {/* Author */}
        <div className="flex items-center gap-3 border-t border-white/5 pt-5">
          <Avatar className="h-10 w-10 rounded-xl border border-white/10 shrink-0">
            <AvatarFallback className="bg-white/5 text-white font-bold font-display text-xs">
              {review.author.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">{review.author}</p>
            <p className="text-[10px] text-white/40">{review.date}</p>
          </div>
          <Badge variant="outline" className={`capitalize flex items-center gap-1 text-[10px] shrink-0 ${getRoleBadgeClass(review.role)}`}>
            {getRoleIcon(review.role)} {review.role}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PublicReviews() {
  const navigate = useNavigate();
  const heroView = useInView();
  const gridView = useInView(0.05);

  const [category, setCategory] = useState<ReviewCategory>("all");
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 12;

  const loadReviews = async (cat: ReviewCategory, pg: number, append = false) => {
    if (pg === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const result = await fetchPublicReviewsPaginated(cat, pg, pageSize);
      setReviews(prev => append ? [...prev, ...result.reviews] : result.reviews);
      setTotal(result.total);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(0);
    loadReviews(category, 0);
  }, [category]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadReviews(category, nextPage, true);
  };

  const hasMore = reviews.length < total;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-primary/15 rounded-full mix-blend-screen filter blur-[150px] -translate-x-1/2 -translate-y-1/4 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-accent/10 rounded-full mix-blend-screen filter blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-accent shadow-[0_0_15px_hsl(225_100%_55%/0.5)]">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-2xl tracking-tight font-bold text-white">JobHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="hover:text-white hover:bg-white/5">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => navigate("/login?tab=register")} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-[0_0_20px_hsl(225_100%_55%/0.4)] rounded-xl">
              Sign up <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <section ref={heroView.ref} className="pt-20 pb-12 relative">
        <div className={`max-w-7xl mx-auto px-6 transition-all duration-1000 ${heroView.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"}`}>
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-6 backdrop-blur-md">
              <MessageSquareQuote className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-accent tracking-wider uppercase">Community Feedback</span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-black text-white leading-tight tracking-tighter mb-4">
              What People <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Are Saying</span>
            </h1>
            <p className="text-xl text-white/50 font-light max-w-xl mx-auto">
              Real feedback from students, universities, and companies using JobHub.
            </p>

            {/* Stats Bar */}
            <div className="mt-10 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="font-display text-3xl font-bold text-white">{total}</p>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Total Reviews</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Top Rated Platform</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="pb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border ${
                  category === cat.key
                    ? "bg-primary/20 border-primary/50 text-white shadow-[0_0_15px_hsl(225_100%_55%/0.3)]"
                    : "border-white/10 text-white/50 hover:text-white hover:bg-white/5 hover:border-white/20"
                }`}
              >
                <span className={category === cat.key ? cat.color : ""}>{cat.label}</span>
                <span className="ml-1.5 text-[10px] text-white/30">({cat.description})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section ref={gridView.ref} className="pb-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-white/40 animate-pulse">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-3xl">
              <MessageSquareQuote className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-white/40 text-lg">No reviews found in this category.</p>
              <Button variant="ghost" className="mt-4 text-primary" onClick={() => setCategory("all")}>
                View all reviews
              </Button>
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-700 ${gridView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                {reviews.map((review, i) => (
                  <ReviewCard key={review.id} review={review} index={i} />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-12">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="border-white/10 text-white bg-white/5 backdrop-blur hover:bg-white/10 rounded-xl px-10 h-14 font-medium"
                  >
                    {loadingMore ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...</>
                    ) : (
                      <><ChevronDown className="h-4 w-4 mr-2" /> Load More Reviews</>
                    )}
                  </Button>
                </div>
              )}

              {/* Bottom count */}
              <p className="text-center text-white/20 text-sm mt-8">
                Showing {reviews.length} of {total} reviews
              </p>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-background py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs text-white/30 font-medium tracking-wide">© 2026 JOBHUB. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
}
