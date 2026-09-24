import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Ban, Trash2, Loader2, Building2, GraduationCap, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fetchUsers, banUser, deleteUser, SystemUser } from "@/services/api";

export default function UserManagement() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data);
      } catch (error) {
        toast.error("Failed to load users from database.");
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleBan = async (id: string, name: string) => {
    try {
      await banUser(id);
      toast.success(`${name} has been banned`);
      setUsers(users.map(u => u.id === id ? { ...u, status: "banned" } : u));
    } catch (error) {
      toast.error("Failed to ban user.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if(!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteUser(id);
      toast.success(`${name} has been deleted`);
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      toast.error("Failed to delete user.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading platform records...</p>
      </div>
    );
  }

  const companies = users.filter(u => u.role === "company");
  const universities = users.filter(u => u.role === "university_admin");
  const candidates = users.filter(u => u.role === "student");

  const UserTable = ({ filteredUsers, icon: Icon }: { filteredUsers: SystemUser[], icon: any }) => (
    <Card className="border-border bg-card/40 backdrop-blur-md shadow-elevated">
      <CardHeader className="border-b border-white/5 bg-background/50">
        <CardTitle className="font-display flex items-center gap-2 tracking-tight">
          <Icon className="h-5 w-5 text-primary" /> Active Profiles ({filteredUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-background/80">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>Profile Info</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined / Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No records found.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-white/[0.02] transition-colors border-white/5">
                    <TableCell>
                      <div className="font-semibold text-foreground tracking-tight">{u.name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">ID: {u.id.substring(0,8)}...</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "outline" : "destructive"} className={u.status === "active" ? "text-emerald-400 border-emerald-400/30 font-medium" : ""}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">{u.createdAt || "Recently"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {u.status !== "banned" && (
                          <Button size="sm" variant="outline" className="h-8 border-white/10 hover:bg-warning/10 hover:text-warning hover:border-warning/30 transition-colors" onClick={() => handleBan(u.id, u.name || u.email)}>
                            <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8 border-white/10 text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors" onClick={() => handleDelete(u.id, u.name || u.email)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div>
        <h1 className="font-display leading-none text-3xl font-bold tracking-tight mb-2">User Datatables</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" /> Comprehensive directory of all registered platform participants.
        </p>
      </div>
      
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="mb-6 bg-card border border-border h-auto p-1 overflow-x-auto w-full sm:w-auto flex justify-start sm:inline-flex">
          <TabsTrigger value="company" className="py-2.5 px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <Building2 className="w-4 h-4 mr-2" /> Companies
          </TabsTrigger>
          <TabsTrigger value="university" className="py-2.5 px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <GraduationCap className="w-4 h-4 mr-2" /> Universities
          </TabsTrigger>
          <TabsTrigger value="candidate" className="py-2.5 px-6 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <User className="w-4 h-4 mr-2" /> Candidates
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="company" className="m-0 outline-none">
          <UserTable filteredUsers={companies} icon={Building2} />
        </TabsContent>
        <TabsContent value="university" className="m-0 outline-none">
          <UserTable filteredUsers={universities} icon={GraduationCap} />
        </TabsContent>
        <TabsContent value="candidate" className="m-0 outline-none">
          <UserTable filteredUsers={candidates} icon={User} />
        </TabsContent>
      </Tabs>
    </div>
  );
}