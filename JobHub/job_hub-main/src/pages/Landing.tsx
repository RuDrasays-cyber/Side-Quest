import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowRight,
  Sparkles,
  Zap,
  BarChart3,
  CheckCircle2,
  Star,
  Target,
  Shield,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Building2,
  LayoutDashboard
} from "lucide-react";
import { fetchReviews, fetchLandingStats, type LandingStats } from "@/services/api";

function useInView(threshold = 0.15) {
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


function useCountUp(target: number, duration: number = 2000, active: boolean = false) {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!active || hasAnimated.current || target <= 0) return;
    hasAnimated.current = true;

    let startTime: number | null = null;
    let rafId: number;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, active]);

  return value;
}


function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const features = [
  {
    icon: Target,
    title: "Precision Matching",
    description: "Algorithmic correlation between your skills and employer requirements, eliminating irrelevant noise.",
    color: "bg-primary text-primary-foreground",
    colSpan: "md:col-span-2",
  },
  {
    icon: Shield,
    title: "Domain Auth",
    description: "Automated student verification through university email domains. Zero manual friction.",
    color: "bg-accent/20 text-accent",
    colSpan: "md:col-span-1",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description: "Actionable, segmented insights tracking placement metrics for universities and hiring partners.",
    color: "bg-warning/20 text-warning",
    colSpan: "md:col-span-1",
  },
  {
    icon: Zap,
    title: "Real-Time Tracking",
    description: "Instant status updates across every stage of the application lifecycle without latency.",
    color: "bg-primary/20 text-primary",
    colSpan: "md:col-span-2",
  },
];

// Removed hardcoded testimonials to pull exclusively from database

const previews = [
  {
    type: "Student View",
    icon: Briefcase,
    title: "Software Engineer",
    subtitle: "TechCorp Inc. · Fast-Tracked",
    metricLabel: "Profile Match Score",
    metricValue: "95%",
    metricWidth: "95%"
  },
  {
    type: "University View",
    icon: GraduationCap,
    title: "CS Batch 2026",
    subtitle: "Placement Drive Active",
    metricLabel: "Students Placed",
    metricValue: "82%",
    metricWidth: "82%"
  },
  {
    type: "Company View",
    icon: Building2,
    title: "Frontend Pipeline",
    subtitle: "Auto-verified Candidates",
    metricLabel: "Offer Acceptance predicted",
    metricValue: "88%",
    metricWidth: "88%"
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const heroView = useInView();
  const featuresView = useInView();
  const metricsView = useInView();
  const testimonialsView = useInView();
  const ctaView = useInView();

  const [previewIndex, setPreviewIndex] = useState(0);
  const [dynamicTestimonials, setDynamicTestimonials] = useState<any[]>([]);
  const [stats, setStats] = useState<LandingStats>({ studentsPlaced: 0, companies: 0, universities: 0, avgPackageLPA: "0" });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reviewData, statsData] = await Promise.all([
          fetchReviews(),
          fetchLandingStats(),
        ]);
        // Shuffle reviews so each visit shows a different order
        setDynamicTestimonials(shuffleArray(reviewData).slice(0, 6));
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load landing data:", error);
      }
    };
    loadData();
  }, []);

  // Animated counter values
  const animStudents = useCountUp(stats.studentsPlaced, 2000, metricsView.visible);
  const animCompanies = useCountUp(stats.companies, 1800, metricsView.visible);
  const animUniversities = useCountUp(stats.universities, 1600, metricsView.visible);
  const animAvgPkg = useCountUp(Math.round(parseFloat(stats.avgPackageLPA) * 10), 2200, metricsView.visible);

  const handleNextPreview = () => setPreviewIndex((prev) => (prev + 1) % previews.length);
  const handlePrevPreview = () => setPreviewIndex((prev) => (prev === 0 ? previews.length - 1 : prev - 1));

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Global Background Glows matching Medvolve template */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-primary/20 rounded-full mix-blend-screen filter blur-[150px] -translate-x-1/2 -translate-y-1/4 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-accent/15 rounded-full mix-blend-screen filter blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-xl hardware-accelerated">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-accent shadow-[0_0_15px_hsl(225_100%_55%/0.5)]">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-2xl tracking-tight font-bold text-white">JobHub</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-4 border-white/10 pl-6">
              <Button variant="ghost" onClick={() => navigate("/login")} className="hover:text-white hover:bg-white/5">Log in</Button>
              <Button onClick={() => navigate("/login?tab=register")} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-[0_0_20px_hsl(225_100%_55%/0.4)] rounded-xl">
                Sign up <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero: Left Content, Right Floating Widget */}
      <section ref={heroView.ref} className="relative pt-24 pb-32">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-64 items-center">

          {/* Left: Heavy Typography */}
          <div className={`transition-all duration-1000 ${heroView.visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-8 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-accent tracking-wider uppercase">Smart Placement Platform</span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tighter mb-8 pb-2">
              <span className="whitespace-nowrap">Where Talent Meets</span> <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-primary to-accent pb-2 inline-block">Opportunity</span>
            </h1>
            <p className="text-xl text-white/60 mb-10 max-w-2xl leading-relaxed font-light">
              Smart job matching, automatic verification, and scoped analytics — connecting students, universities, and companies seamlessly.
            </p>
            <div className="flex gap-4">
              <Button size="lg" onClick={() => navigate("/login?tab=register")} className="bg-warning text-warning-foreground hover:bg-warning/90 h-14 px-8 text-lg font-medium shadow-[0_0_30px_hsl(39_99%_56%/0.3)] rounded-xl">
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="border-white/10 text-white h-14 px-8 bg-white/5 backdrop-blur hover:bg-white/10 rounded-xl">
                Explore Features
              </Button>
            </div>
          </div>

          {/* Right: Interactive Glassmorphic Widget Mockup */}
          <div className={`relative transition-all duration-1000 delay-300 mt-8 ${heroView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
            {/* Glowing orb behind the widget */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/30 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative w-full max-w-[420px] mx-auto bg-card/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl hardware-accelerated animate-float group/card overflow-hidden">

              {/* Carousel UI Controls (Inside card boundaries, centred vertically) */}
              <button
                onClick={handlePrevPreview}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white/40 hover:text-white hover:bg-white/15 transition-all opacity-0 group-hover/card:opacity-100 z-20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                onClick={handleNextPreview}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white/40 hover:text-white hover:bg-white/15 transition-all opacity-0 group-hover/card:opacity-100 z-20"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Dynamic Content */}
              <div key={previewIndex} className="animate-fade-in relative z-10 pt-2">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-5 border border-primary/30 shadow-inner">
                    {(() => {
                      const Icon = previews[previewIndex].icon;
                      return <Icon className="h-7 w-7 text-primary" />;
                    })()}
                  </div>
                  <p className="text-white/50 text-xs mb-2 font-bold uppercase tracking-widest">{previews[previewIndex].type}</p>
                  <h2 className="font-display text-3xl font-bold text-white mb-2 tracking-tight">{previews[previewIndex].title}</h2>
                  <p className="text-white/80 text-lg">{previews[previewIndex].subtitle}</p>
                </div>

                <div className="mb-10">
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 mb-4 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-primary rounded-full shadow-[0_0_10px_hsl(225_100%_55%/0.8)] transition-all duration-1000 ease-out"
                      style={{ width: previews[previewIndex].metricWidth }}
                    />
                  </div>
                  <div className="flex justify-between text-sm font-medium px-1">
                    <span className="text-white/70">{previews[previewIndex].metricLabel}</span>
                    <span className="text-accent tracking-wider font-bold">{previews[previewIndex].metricValue}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section ref={metricsView.ref} className="py-12 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm relative z-10">
        <div className={`max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-700 ${metricsView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {[
            { value: `${animStudents.toLocaleString()}+`, label: "Students Placed" },
            { value: `${animCompanies}+`, label: "Companies" },
            { value: `${animUniversities}+`, label: "Universities" },
            { value: `₹${(animAvgPkg / 10).toFixed(1)}L+`, label: "Avg Package" },
          ].map((s, i) => (
            <div key={s.label} className="text-center border-r last:border-0 border-white/5">
              <p className="font-display text-4xl font-bold text-white mb-1 tabular-nums">{s.value}</p>
              <p className="text-xs text-accent uppercase tracking-widest font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" ref={featuresView.ref} className="py-32 relative">
        <div className={`max-w-7xl mx-auto px-6 transition-all duration-700 ${featuresView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="mb-16">
            <h2 className="font-display text-4xl lg:text-6xl font-black text-white tracking-tighter mb-4">
              Everything You Need for <br /><span className="text-primary">Campus Placements</span>
            </h2>
            <p className="text-white/60 text-xl max-w-xl font-light">
              Built for every stakeholder in the placement ecosystem with a focus on a seamless experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Card
                key={f.title}
                className={`${f.colSpan} relative group overflow-hidden border border-white/10 bg-card/40 backdrop-blur-xl hover:border-primary/50 transition-colors duration-500 rounded-3xl`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <CardContent className="p-10 relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className={`h-12 w-12 rounded-2xl ${f.color} flex items-center justify-center mb-8 shadow-lg`}>
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display font-bold text-2xl text-white mb-3">{f.title}</h3>
                    <p className="text-white/60 font-light leading-relaxed text-lg">{f.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee Testimonials */}
      <section ref={testimonialsView.ref} className="py-24 relative border-t border-white/5 bg-background overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-warning/5 rounded-full filter blur-[100px]" />

        <div className={`max-w-7xl mx-auto px-6 mb-16 transition-all duration-700 ${testimonialsView.visible ? "opacity-100" : "opacity-0"}`}>
          <div className="mb-2">
            <span className="text-warning text-sm uppercase tracking-widest font-bold">Success Stories</span>
          </div>
          <h2 className="font-display text-4xl font-bold text-white tracking-tighter">
            Loved by Thousands
          </h2>
        </div>

        <div className="relative w-full overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
          <div
            className="flex hover:[animation-play-state:paused] animate-marquee"
            style={{
              willChange: "transform",
              backfaceVisibility: "hidden",
            }}
          >
            {/* Strip A */}
            <div className="flex gap-6 shrink-0 pr-6">
              {dynamicTestimonials.map((t, i) => (
                <Card
                  key={`a-${t.author || t.name}-${i}`}
                  className="w-[400px] shrink-0 border border-white/5 bg-card/30 backdrop-blur-md shadow-lg rounded-3xl"
                >
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-6">
                      {Array.from({ length: Math.floor(t.rating || t.stars || 5) }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                      ))}
                    </div>
                    <p className="text-white/70 leading-relaxed mb-8 font-light italic">"{t.content || t.text}"</p>
                    <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                      <Avatar className="h-12 w-12 rounded-2xl border border-white/10 shrink-0">
                        <AvatarImage src={t.avatar_url} />
                        <AvatarFallback className="bg-white/5 text-white font-bold font-display text-sm">
                          {(t.author || t.name || "?").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white">{t.author || t.name}</p>
                        <p className="text-xs text-accent uppercase tracking-wider">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Strip B (exact duplicate for seamless loop) */}
            <div className="flex gap-6 shrink-0 pr-6">
              {dynamicTestimonials.map((t, i) => (
                <Card
                  key={`b-${t.author || t.name}-${i}`}
                  className="w-[400px] shrink-0 border border-white/5 bg-card/30 backdrop-blur-md shadow-lg rounded-3xl"
                >
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-6">
                      {Array.from({ length: Math.floor(t.rating || t.stars || 5) }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                      ))}
                    </div>
                    <p className="text-white/70 leading-relaxed mb-8 font-light italic">"{t.content || t.text}"</p>
                    <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold font-display">
                        {(t.author || t.name || "?").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{t.author || t.name}</p>
                        <p className="text-xs text-accent uppercase tracking-wider">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* More Reviews Button */}
        <div className={`flex justify-center mt-12 transition-all duration-700 delay-300 ${testimonialsView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/reviews")}
            className="border-white/10 text-white bg-white/5 backdrop-blur hover:bg-white/10 rounded-xl px-8 h-12 font-medium"
          >
            More Reviews <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaView.ref} className="py-32 relative">
        <div className={`max-w-7xl mx-auto px-6 transition-all duration-1000 ${ctaView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-card/60 backdrop-blur-3xl shadow-2xl">
            {/* Deep glow background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,hsl(225_100%_55%/0.15),transparent_60%)]" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full filter blur-[100px]" />

            <div className="relative p-16 md:p-24 flex flex-col items-center text-center z-10">
              <div className="w-16 h-16 bg-warning/20 border border-warning/50 rounded-2xl flex items-center justify-center mb-8 rotate-12">
                <CheckCircle2 className="h-8 w-8 text-warning" />
              </div>
              <h2 className="font-display text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter max-w-3xl">
                Ready to Transform Your <span className="text-warning">Placements</span>?
              </h2>
              <p className="text-white/60 max-w-xl mx-auto mb-12 text-xl font-light">
                Join thousands of students, universities, and companies already using JobHub to streamline the placement ecosystem.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => navigate("/login?tab=register")} className="bg-warning text-warning-foreground hover:bg-warning/90 h-16 px-10 text-lg font-bold shadow-[0_0_40px_hsl(39_99%_56%/0.4)] transition-all hover:scale-105 rounded-2xl">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
            {/* Corner tech accents */}
            <div className="absolute top-8 left-8 w-4 h-4 border-t-2 border-l-2 border-white/30 rounded-tl-sm" />
            <div className="absolute bottom-8 right-8 w-4 h-4 border-b-2 border-r-2 border-white/30 rounded-br-sm" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-background pt-20 pb-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 mb-16 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-accent">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <span className="font-display font-bold text-white text-xl">JobHub</span>
            </div>
            <div className="text-sm text-white/50 font-medium text-center">
              <span className="hover:text-white cursor-pointer transition-colors">support@job-hub.work.gd</span>
            </div>
            <div className="text-sm text-white/50 font-medium text-center md:text-right">
              <span className="hover:text-white cursor-pointer transition-colors">+1 (800) 555-JOBS</span>
            </div>
          </div>
          <p className="text-xs text-white/30 text-center font-medium tracking-wide">© 2026 JOBHUB. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
}