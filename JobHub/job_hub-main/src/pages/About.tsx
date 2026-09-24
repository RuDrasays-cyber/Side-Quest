import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Mail, Phone, MapPin, Globe, ShieldCheck, Briefcase, GraduationCap, Building2 } from "lucide-react";

const features = [
  {
    icon: GraduationCap,
    title: "For Students",
    description: "Browse jobs auto-filtered by your resume and CGPA. Track applications from applied to selected. Get automatically verified via your university email domain.",
  },
  {
    icon: Building2,
    title: "For Companies",
    description: "Post job openings with specific requirements. Manage candidate applications with status tracking. View hiring analytics across universities and off-campus sources.",
  },
  {
    icon: Globe,
    title: "For Universities",
    description: "Register your institution's email domains for automatic student verification. Access scoped analytics including placement rates, average salaries, and company participation — visible only to your institution.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    description: "Role-based access ensures each user only sees their own data. University analytics are isolated per institution. Company hiring stats remain private.",
  },
];

export default function About() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">About JobHub</h1>
        <p className="text-muted-foreground">Your trusted campus placement management platform</p>
      </div>

      {/* Hero */}
      <Card className="shadow-card overflow-hidden">
        <div className="gradient-hero p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <LayoutDashboard className="h-10 w-10 text-primary-foreground" />
            <h2 className="font-display text-3xl font-bold text-primary-foreground">JobHub</h2>
          </div>
          <p className="text-primary-foreground/80 max-w-xl mx-auto">
            A comprehensive job placement portal connecting students, companies, and universities in one seamless platform. Streamlining campus recruitment with smart automation and data-driven insights.
          </p>
        </div>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((f) => (
          <Card key={f.title} className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                {f.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> Contact & Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">support@job-hub.work.gd</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-xs text-muted-foreground">+1 (800) 555-JOBS</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-xs text-muted-foreground">123 Placement Ave, Tech Park</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}