import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator,
  useSidebar
} from "@/components/ui/sidebar";
import * as React from "react";
import { NavLink } from "@/components/NavLink";
import {
  Briefcase,
  FileText,
  User,
  PlusCircle,
  Inbox,
  Globe,
  ShieldCheck,
  BarChart3,
  Users,
  Settings,
  LogOut,
  LayoutDashboard,
  Info,
  Star,
  MessageSquarePlus,
  Bell,
  GraduationCap,
  Building2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/services/api";

// 1. Only Role-Specific links go here
const roleNavItems: Record<UserRole, { title: string; url: string; icon: React.ElementType }[]> = {
  student: [
    { title: "Job Feed", url: "/dashboard/jobs", icon: Briefcase },
    { title: "Applications", url: "/dashboard/applications", icon: FileText },
    { title: "Your Profile", url: "/dashboard/student-profile", icon: GraduationCap },
  ],
  company: [
    { title: "Post a Job", url: "/dashboard/post-job", icon: PlusCircle },
    { title: "My Posted Jobs", url: "/dashboard/my-jobs", icon: Briefcase },
    { title: "Candidate Inbox", url: "/dashboard/candidates", icon: Inbox },
    { title: "My Organization", url: "/dashboard/org-profile", icon: Building2 },
    { title: "Browse Universities", url: "/dashboard/browse-orgs", icon: Search },
  ],
  university_admin: [
    { title: "Domain Management", url: "/dashboard/domains", icon: Globe },
    { title: "Student Verification", url: "/dashboard/verifications", icon: ShieldCheck },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "My Organization", url: "/dashboard/uni-profile", icon: Building2 },
    { title: "Browse Companies", url: "/dashboard/browse-orgs", icon: Search },
  ],
  super_admin: [
    { title: "Dashboard Report", url: "/dashboard/analytics-admin", icon: BarChart3 },
    { title: "Verifications", url: "/dashboard/admin-verifications", icon: ShieldCheck },
    { title: "User Datatables", url: "/dashboard/users", icon: Users },
    { title: "Platform Reviews", url: "/dashboard/reviews", icon: Star },
    { title: "Global Settings", url: "/dashboard/settings", icon: Settings },
  ],
};

// 2. Links that EVERY user gets go here
const universalNavItems = [
  { title: "My Profile", url: "/dashboard/profile", icon: User },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  { title: "Write a Review", url: "/dashboard/review", icon: MessageSquarePlus },
  { title: "About", url: "/dashboard/about", icon: Info },
];

function SidebarNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { state, setOpen, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const [hoverOpened, setHoverOpened] = React.useState(false);

  const handleNavClick = () => {
    if (!isMobile) {
      // Pin the sidebar open by clearing the hover state,
      // so mouse leave doesn't close it!
      setHoverOpened(false);
    } else {
      setOpenMobile(false);
    }
  };

  const handleLogoClick = () => {
    if (isMobile) {
      setOpenMobile(true);
    } else {
      if (hoverOpened) {
        // Pinned! Clicking the logo when it's temporarily expanded by hover makes it stay open.
        setHoverOpened(false);
      } else {
        // Toggle normally between open and close
        toggleSidebar();
      }
    }
  };

  const role = (user?.role as UserRole) || "student";
  const items = roleNavItems[role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar 
      collapsible="icon"
      onMouseEnter={() => {
        if (!isMobile && state === "collapsed") {
          setOpen(true);
          setHoverOpened(true);
        }
      }}
      onMouseLeave={() => {
        if (!isMobile && hoverOpened) {
          setOpen(false);
          setHoverOpened(false);
        }
      }}
    >
      <SidebarContent>
        <div 
          onClick={handleLogoClick}
          className="flex h-14 cursor-pointer items-center overflow-hidden px-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center hover:text-primary transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent relative">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <span className="ml-3 font-display text-lg font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden whitespace-nowrap">
            JobHub
          </span>
        </div>
        
        {/* Main Role-Specific Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            {role === "student" ? "Student" : role === "company" ? "Company" : role === "university_admin" ? "Placement Cell" : "Admin"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild onClick={handleNavClick}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Universal Menu (Profile, About) */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            General
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {universalNavItems.map((item) => {
                // Hide write a review for super admin
                if (role === "super_admin" && item.url === "/dashboard/review") {
                  return null;
                }
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end
                        className="text-white/70 hover:bg-sidebar-accent/50 hover:text-primary transition-colors"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                        onClick={handleNavClick}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Info (no more separate logout button in sidepanel) */}
        <div className="mt-auto p-4 border-t border-border">
          <div className="px-2 pb-2">
            <p className="text-sm font-medium text-sidebar-foreground line-clamp-1">{user?.name || "Loading..."}</p>
            <p className="text-xs text-sidebar-foreground/50 line-clamp-1">{user?.email || ""}</p>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  
  const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SidebarNav />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-card px-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex-1">Dashboard</h2>
            <div className="flex flex-row items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8 cursor-pointer border border-border">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name || "User Profile"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email || "user@example.com"}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = "/dashboard/profile"}>
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  {user?.role === "super_admin" && (
                    <DropdownMenuItem onClick={() => window.location.href = "/dashboard/settings"}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    logout();
                    window.location.href = "/login";
                  }} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}