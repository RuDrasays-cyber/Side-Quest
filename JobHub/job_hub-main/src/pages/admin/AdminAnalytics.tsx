import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, GraduationCap, Briefcase, Users, Globe, Loader2, ArrowUpRight, TrendingUp } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend, ResponsiveContainer,
} from "recharts";
import { fetchAdminAnalytics } from "@/services/api";
import { toast } from "sonner";

const renderInnerLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(270, 60%, 50%)"];

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const result = await fetchAdminAnalytics();
        setData(result);
      } catch (error) {
        toast.error("Failed to load global platform analytics.");
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Compiling global platform data...</p>
      </div>
    );
  }

  const stats = [
    { label: "Total Students", value: data?.totalStudents || 0, icon: GraduationCap, sub: `${data?.onCampusStudents || 0} On / ${data?.offCampusStudents || 0} Off`, trend: data?.studentTrend || "+0%" },
    { label: "Active Universities", value: data?.totalUniversities || 0, icon: Globe, sub: "All verified regions", trend: data?.uniTrend || "+0%" },
    { label: "Registered Companies", value: data?.totalCompanies || 0, icon: Building2, sub: `${data?.activeJobs || 0} active listings`, trend: data?.compTrend || "+0%" },
    { label: "Total Jobs Posted", value: data?.totalJobs || 0, icon: Briefcase, sub: "Lifetime count across platform", trend: data?.jobTrend || "+0%" },
    { label: "Total Placements", value: data?.totalPlacements || 0, icon: Users, sub: `Global placement success`, trend: data?.placementTrend || "+0%" },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display leading-none text-3xl font-bold tracking-tight mb-2">Platform Overview</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Live analytical report of the JobHub ecosystem.
          </p>
        </div>
      </div>

      {/* Hero Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((s, idx) => (
          <Card key={s.label} className="relative overflow-hidden border-border bg-card/40 backdrop-blur-xl shadow-elevated group hover:-translate-y-1 transition-all duration-300">
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl shadow-inner ${idx === 0 ? "bg-primary/20 text-primary" : idx === 1 ? "bg-indigo-500/20 text-indigo-400" : idx === 2 ? "bg-accent/20 text-accent" : idx === 3 ? "bg-emerald-500/20 text-emerald-400" : "bg-warning/20 text-warning"}`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  {s.trend}
                </div>
              </div>
              <div>
                <p className="text-3xl font-black font-display tracking-tight text-white">{s.value.toLocaleString()}</p>
                <p className="text-sm font-semibold text-foreground/80 mt-1">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Graphical Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card className="border-border bg-card/40 backdrop-blur-md shadow-elevated">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="font-display text-lg tracking-tight">Monthly Growth</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
             {data?.monthlyRegistrations?.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.monthlyRegistrations} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border opacity-50" vertical={false} />
                  <XAxis dataKey="month" className="text-xs font-medium" tickLine={false} axisLine={false} dy={10} />
                  <YAxis className="text-xs font-medium" tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff', fontWeight: 600 }} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: 13, fontWeight: 500 }} />
                  <Line type="monotone" dataKey="students" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="companies" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="universities" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
             ) : <div className="h-[320px] flex items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-xl">Insufficient growth data available</div>}
          </CardContent>
        </Card>

        {/* Roles Distribution Pie */}
        <Card className="border-border bg-card/40 backdrop-blur-md shadow-elevated">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="font-display text-lg tracking-tight">Global User Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {data?.roleDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={data.roleDistribution} cx="50%" cy="50%" outerRadius={110} innerRadius={60} dataKey="value" label={renderInnerLabel} labelLine={false} stroke="hsl(var(--card))" strokeWidth={2}>
                    {data.roleDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff', fontWeight: 600 }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 13, fontWeight: 500 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[320px] flex items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-xl">Insufficient demographic data</div>}
          </CardContent>
        </Card>
      </div>

       {/* Row 2: Bar charts */}
       <div className="grid grid-cols-1 gap-6">
          <Card className="border-border bg-card/40 backdrop-blur-md shadow-elevated">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="font-display text-lg tracking-tight">Top Recruiting Partners</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {data?.jobPostingsByCompany?.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.jobPostingsByCompany} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border opacity-50" vertical={false} />
                    <XAxis dataKey="company" className="text-xs font-medium" tickLine={false} axisLine={false} dy={10} />
                    <YAxis className="text-xs font-medium" tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip cursor={{ fill: 'hsl(var(--primary)/0.1)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff', fontWeight: 600 }} />
                    <Bar dataKey="jobs" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
               ) : <div className="h-[320px] flex items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-xl">No active recruiting data</div>}
            </CardContent>
          </Card>
       </div>
    </div>
  );
}