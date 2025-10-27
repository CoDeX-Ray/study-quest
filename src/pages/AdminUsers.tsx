import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Ban, Lock, Unlock, Trash2, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  created_at: string;
  status: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [actionType, setActionType] = useState<"delete" | "block" | "ban" | "unblock" | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<Profile | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      } else {
        setProfiles(data || []);
      }
      setLoading(false);
    };

    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin, toast]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "professional": return "default";
      case "student": return "secondary";
      default: return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "blocked": return "secondary";
      case "banned": return "destructive";
      default: return "outline";
    }
  };

  const handleUserAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      if (actionType === "delete") {
        const { error } = await supabase.from("profiles").delete().eq("id", selectedUser.id);
        if (error) throw error;
        toast({ title: "Success", description: "User deleted successfully" });
      } else {
        const newStatus = actionType === "unblock" ? "active" : actionType;
        const { error } = await supabase
          .from("profiles")
          .update({ status: newStatus })
          .eq("id", selectedUser.id);
        if (error) throw error;
        toast({ title: "Success", description: `User ${actionType}ed successfully` });
      }
      
      // Refresh profiles
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!roleChangeUser) return;

    try {
      // Update in user_roles table
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", roleChangeUser.id);
      
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert([{ user_id: roleChangeUser.id, role: newRole as "admin" | "professional" | "student" }]);
      
      if (insertError) throw insertError;

      // Update in profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: newRole as "admin" | "professional" | "student" })
        .eq("id", roleChangeUser.id);
      
      if (profileError) throw profileError;

      toast({ title: "Success", description: "User role updated successfully" });
      
      // Refresh profiles
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRoleChangeUser(null);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-warning/5 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-10 w-10 text-primary" />
            User Management
          </h1>
        </div>

        <Card className="border-border/50 bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold text-foreground">Name</th>
                  <th className="text-left p-4 font-semibold text-foreground">Email</th>
                  <th className="text-left p-4 font-semibold text-foreground">Role</th>
                  <th className="text-left p-4 font-semibold text-foreground">Status</th>
                  <th className="text-left p-4 font-semibold text-foreground">Level</th>
                  <th className="text-left p-4 font-semibold text-foreground">XP</th>
                  <th className="text-left p-4 font-semibold text-foreground">Joined</th>
                  <th className="text-left p-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-border/50 hover:bg-surface-elevated">
                    <td className="p-4 text-foreground">{profile.full_name || "N/A"}</td>
                    <td className="p-4 text-foreground">{profile.email}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(profile.role)}>
                          {profile.role}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRoleChangeUser(profile)}
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={getStatusBadgeVariant(profile.status)}>
                        {profile.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-foreground">{profile.level}</td>
                    <td className="p-4 text-foreground">{profile.xp}</td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {profile.status === "blocked" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(profile);
                              setActionType("unblock");
                            }}
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(profile);
                              setActionType("block");
                            }}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(profile);
                            setActionType("ban");
                          }}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedUser(profile);
                            setActionType("delete");
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AlertDialog open={!!selectedUser && !!actionType} onOpenChange={() => {
        setSelectedUser(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {actionType} user
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionType} {selectedUser?.full_name || selectedUser?.email}?
              {actionType === "delete" && " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUserAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!roleChangeUser} onOpenChange={() => setRoleChangeUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new role for {roleChangeUser?.full_name || roleChangeUser?.email}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select onValueChange={handleRoleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
