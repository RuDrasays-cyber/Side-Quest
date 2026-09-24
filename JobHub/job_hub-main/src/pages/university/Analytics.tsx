import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Building2, Users, DollarSign, FileText, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { fetchPlacementAnalytics } from "@/services/api";
import { toast } from "sonner";

const renderInnerLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const COLORS = [
  "hsl(215, 90%, 42%)",
  "hsl(168, 70%, 42%)",
  "hsl(38, 92%, 50%)",
  "hsl(215, 90%, 55%)",
  "hsl(215, 12%, 50%)",
];

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const result = await fetchPlacementAnalytics();
        setData(result);
      } catch (error) {
        toast.error("Failed to load university analytics.");
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Crunching placement data...</p>
      </div>
    );
  }

  
  const monthlyData = data?.monthlyPlacements || [];
  const companyData = data?.companyParticipation || [];
  const placementRate = data?.placementPercentage || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Placement Analytics</h1>
        <p className="text-muted-foreground">Insights for your university's placement performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center">
            <FileText className="h-8 w-8 mx-auto text-info mb-2" />
            <p className="text-3xl font-bold font-display">{data?.totalApplications || 0}</p>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-3xl font-bold font-display">{data?.placedStudents || 0}<span className="text-lg text-muted-foreground">/{data?.totalStudents || 0}</span></p>
            <p className="text-sm text-muted-foreground">Placed Students ({placementRate}%)</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-3xl font-bold font-display">{data?.avgSalary || "$0"}</p>
            <p className="text-sm text-muted-foreground">Avg Placement Salary</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-3xl font-bold font-display">{data?.activeCompanies || 0}</p>
            <p className="text-sm text-muted-foreground">Companies Recruited</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Monthly Placements & Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="placed" name="Placed" fill="hsl(215, 90%, 42%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="applications" name="Applications" fill="hsl(215, 90%, 42%, 0.2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-muted-foreground">No monthly data available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Company Participation
            </CardTitle>
          </CardHeader>
          <CardContent>
             {companyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={companyData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={renderInnerLabel} labelLine={false}>
                      {companyData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'system-ui, sans-serif', fontWeight: 500 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-muted-foreground">No company data available yet.</p>
              )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        This data is scoped to your university only. Other universities cannot view these analytics.
      </p>
    </div>
  );
}