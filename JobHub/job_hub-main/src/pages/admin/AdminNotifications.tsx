import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, AlertCircle, Loader2, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchMyNotifications, markNotificationsRead, dismissNotification } from "@/services/api";
import { toast } from "sonner";

interface NotifItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
  type?: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMyNotifications();
        setNotifications(data || []);
      } catch {
        toast.error("Failed to load notifications.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markNotificationsRead();
    toast.success("All notifications marked as read.");
  };

  const handleDismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await dismissNotification(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading notifications...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display leading-none text-3xl font-bold tracking-tight mb-2">Notifications</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" /> You have {unreadCount} unread notification{unreadCount !== 1 && "s"}.
          </p>
        </div>
        <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0} className="border-border">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Mark all as read
        </Button>
      </div>

      <Card className="border-white/10 bg-card/40 backdrop-blur-md shadow-elevated">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xl">Your Feed</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-6 transition-all hover:bg-white/[0.02] flex items-start gap-5 ${
                    !n.is_read
                      ? "bg-primary/5 border-l-4 border-l-primary"
                      : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className={`mt-1 p-2 rounded-xl bg-background/80 border border-white/5 shadow-inner ${
                    !n.is_read ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {!n.is_read ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground tracking-tight">{n.title}</h4>
                        {!n.is_read && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/20 text-primary uppercase">
                            New
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/70 leading-relaxed">{n.message}</p>
                  </div>
                  <button
                    onClick={() => handleDismiss(n.id)}
                    className="shrink-0 mt-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                    title="Dismiss"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
