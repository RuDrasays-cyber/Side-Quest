import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, ScrollText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchSystemLogs, toggleRegistration } from "@/services/api";

export default function GlobalSettings() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchSystemLogs();
        setLogs(data);
      } catch (error) {
        toast.error("Failed to load settings data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleToggle = async (checked: boolean) => {
    try {
      await toggleRegistration(checked);
      setRegistrationOpen(checked);
      toast.success(`Registration ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update registration settings.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Global Settings</h1>
        <p className="text-muted-foreground">Platform-wide configuration</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Settings className="h-5 w-5" /> Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <Label className="text-base font-medium">Open Registration</Label>
              <p className="text-sm text-muted-foreground">Allow new users to register on the platform</p>
            </div>
            <Switch checked={registrationOpen} onCheckedChange={handleToggle} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><ScrollText className="h-5 w-5" /> System Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <div>
                  <p className="text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">by {log.user}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{log.timestamp}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center py-6 text-muted-foreground">No logs found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}