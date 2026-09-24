import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Plus, CheckCircle, Loader2, AlertCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { fetchDomains, addDomain, fetchMyUniversityProfile, fetchStudentVerifications, UniversityDomain, StudentVerification } from "@/services/api";
import { getEmailDomain } from "@/lib/domainUtils";

export default function DomainManagement() {
  const [domains, setDomains] = useState<UniversityDomain[]>([]);
  const [students, setStudents] = useState<StudentVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  
  const [uniName, setUniName] = useState(""); 
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const profile = await fetchMyUniversityProfile();
      let currentUniName = "";
      if (profile) {
        setUniName(profile.university_name);
        currentUniName = profile.university_name;
        setProfileLoaded(true);
      }

      const allDomains = await fetchDomains();
      const myDomains = currentUniName 
        ? allDomains.filter(d => d.universityName.toLowerCase() === currentUniName.toLowerCase())
        : [];
      setDomains(myDomains);

      const allStudents = await fetchStudentVerifications();
      const myDomainStrings = myDomains.map(d => d.domain.toLowerCase());
      
      const myStudents = allStudents.filter(s => {
        const sDomain = getEmailDomain(s.email).toLowerCase();
        return myDomainStrings.includes(sDomain) || 
               (currentUniName && s.university.toLowerCase() === currentUniName.toLowerCase());
      });
      setStudents(myStudents);

    } catch (error) {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newDomain || !uniName) {
      toast.error("Please fill in both fields");
      return;
    }
    setAdding(true);
    try {
      await addDomain(newDomain, uniName);
      toast.success(`Domain ${newDomain} submitted for verification!`);
      setNewDomain("");
      loadData(); 
    } catch (error) {
      toast.error("Failed to add domain. You may not have permission.");
    } finally {
      setAdding(false);
    }
  };

  if (loading && !profileLoaded) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="font-display text-2xl font-bold">Domain Management</h1>
        <p className="text-muted-foreground">Manage your university's verified domains and view registered students.</p>
      </div>
      
      <Card className="shadow-card border-border bg-card/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Register a Domain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              value={uniName} 
              onChange={(e) => setUniName(e.target.value)} 
              placeholder="University Name (e.g. MIT)" 
              className="flex-1" 
              disabled={profileLoaded} 
            />
            <Input 
              value={newDomain} 
              onChange={(e) => setNewDomain(e.target.value)} 
              placeholder="Domain (e.g. mit.edu)" 
              className="flex-1 bg-background/50" 
            />
            <Button onClick={handleAdd} disabled={adding || !uniName} className="bg-primary hover:bg-primary/90">
              {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} 
              Add Domain
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          Associated Domains
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((d) => (
            <Card key={d.id} className="shadow-card bg-card/40 backdrop-blur-xl border-border">
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-primary" /> {d.domain}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.universityName}</p>
                </div>
                <Badge className={d.verified ? "bg-success/20 text-success border-success/30" : "bg-warning/20 text-warning border-warning/30"} variant="outline">
                  {d.verified ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                  {d.verified ? "Verified" : "Pending"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
        {domains.length === 0 && (
          <p className="text-center py-6 text-muted-foreground bg-card/20 rounded-lg border border-white/5 shadow-sm">No domains found for your university.</p>
        )}
      </div>

      <div className="space-y-4 mt-8">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Students Under University
        </h2>
        <Card className="shadow-card border-border bg-card/40 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-4 font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-md inline-flex w-fit">
                        <Globe className="h-3 w-3" />
                        {getEmailDomain(s.email)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={s.status === 'verified' ? "bg-success/20 text-success border-success/30" : "bg-warning/20 text-warning border-warning/30"} variant="outline">
                        {s.status === 'verified' ? "Auto-Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">
                      <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      No students found under your domains yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}