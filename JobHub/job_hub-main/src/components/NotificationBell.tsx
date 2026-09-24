import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Briefcase, UserCheck, AlertCircle, X, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyNotifications, markNotificationsRead, dismissNotification, supabase } from "@/services/api";
import { toast } from "sonner";

interface NotificationWithIcon {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: string;
  link?: string;
  icon: React.ElementType;
}

const typeColors: Record<string, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  default: "text-muted-foreground",
};

const iconMap: Record<string, React.ElementType> = {
  success: CheckCircle2,
  info: Briefcase,
  warning: AlertCircle,
  user: UserCheck,
  default: BellRing,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationWithIcon[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      const data = await fetchMyNotifications();
      const formatted = data.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        time: timeAgo(n.created_at),
        read: n.is_read,
        type: n.type || "default",
        link: n.link,
        icon: iconMap[n.type] || iconMap.default
      }));
      setNotifications(formatted);
    };

    loadNotifications();

    // Supabase Real-Time Subscription
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new;
          const formattedNotif: NotificationWithIcon = {
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.message,
            time: "Just now",
            read: newNotif.is_read,
            type: newNotif.type || "default",
            link: newNotif.link,
            icon: iconMap[newNotif.type] || iconMap.default
          };
          
          setNotifications(prev => [formattedNotif, ...prev]);
          const Icon = formattedNotif.icon;
          toast(formattedNotif.title, {
            description: formattedNotif.message,
            icon: <Icon className="h-4 w-4 text-primary" />
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markNotificationsRead();
  };

  const handleDismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await dismissNotification(id);
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate("/dashboard/notifications");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center min-w-[18px] h-[18px] animate-scale-in">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-display font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex gap-3 transition-colors ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${typeColors[n.type] || typeColors.default}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-tight ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      <button onClick={() => handleDismiss(n.id)} className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{n.time}</p>
                  </div>
                  {!n.read && (
                    <div className="shrink-0 mt-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t border-white/5">
          <Button
            variant="ghost"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={handleViewAll}
          >
            {unreadCount > 0 ? `View all notifications (${unreadCount} unread)` : "View all notifications"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
