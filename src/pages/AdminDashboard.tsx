import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Users, Activity, Bug, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBugReports: 0,
    openBugReports: 0,
    recentActivities: 0,
  });
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      const [profiles, bugReports, activities, recentActivities] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("bug_reports").select("id, status", { count: "exact" }),
        supabase.from("activity_logs").select("id", { count: "exact", head: true }),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      setStats({
        totalUsers: profiles.count || 0,
        totalBugReports: bugReports.count || 0,
        openBugReports: bugReports.data?.filter(b => b.status === "open").length || 0,
        recentActivities: activities.count || 0,
      });

      // Fetch profile data for recent activities
      if (recentActivities.data) {
        const logsWithProfiles = await Promise.all(
          recentActivities.data.map(async (log) => {
            if (log.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", log.user_id)
                .single();
              return { ...log, profiles: profile } as ActivityLog;
            }
            return { ...log } as ActivityLog;
          })
        );
        setRecentLogs(logsWithProfiles);
      }
      
      setLoading(false);
    };

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-warning/5 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
              <AlertCircle className="h-10 w-10 text-destructive" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Manage and monitor your platform</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="p-6 border-border/50 bg-surface hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
              <Users className="h-12 w-12 text-primary" />
            </div>
          </Card>

          <Card className="p-6 border-border/50 bg-surface hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bug Reports</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalBugReports}</p>
              </div>
              <Bug className="h-12 w-12 text-warning" />
            </div>
          </Card>

          <Card className="p-6 border-border/50 bg-surface hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Issues</p>
                <p className="text-3xl font-bold text-destructive">{stats.openBugReports}</p>
              </div>
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </Card>

          <Card className="p-6 border-border/50 bg-surface hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activities</p>
                <p className="text-3xl font-bold text-foreground">{stats.recentActivities}</p>
              </div>
              <Activity className="h-12 w-12 text-accent" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="bugs">Bug Reports</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-6 border-border/50 bg-surface">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Quick Actions</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Button 
                  onClick={() => navigate("/admin/users")}
                  className="w-full"
                  variant="outline"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
                <Button 
                  onClick={() => navigate("/admin/bug-reports")}
                  className="w-full"
                  variant="outline"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  View Bug Reports
                </Button>
                <Button 
                  onClick={() => navigate("/admin/activity-logs")}
                  className="w-full"
                  variant="outline"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Activity Logs
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-6 border-border/50 bg-surface">
              <h2 className="text-2xl font-bold mb-4">User Management</h2>
              <Button onClick={() => navigate("/admin/users")}>View All Users</Button>
            </Card>
          </TabsContent>

          <TabsContent value="bugs">
            <Card className="p-6 border-border/50 bg-surface">
              <h2 className="text-2xl font-bold mb-4">Bug Reports</h2>
              <Button onClick={() => navigate("/admin/bug-reports")}>View All Reports</Button>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="p-6 border-border/50 bg-surface">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Recent Activity Logs</h2>
                <Button onClick={() => navigate("/admin/activity-logs")}>View All Logs</Button>
              </div>
              <div className="space-y-3">
                {recentLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No recent activities</p>
                ) : (
                  recentLogs.map((log) => {
                    const userName = log.profiles?.full_name || log.profiles?.email || "Unknown";
                    let displayText = "";
                    
                    if (log.action === "Posted content in Community" && log.details) {
                      const details = log.details as any;
                      displayText = `${userName} posted content: "${details.post_title || 'Untitled'}" (${details.post_type || 'post'})`;
                      if (details.content_preview) {
                        displayText += ` - ${details.content_preview}`;
                      }
                    } else if (log.action === "Signed in") {
                      displayText = `${userName} signed in`;
                    } else if (log.action === "Signed out") {
                      displayText = `${userName} signed out`;
                    } else {
                      displayText = `${userName}: ${log.action}`;
                    }

                    return (
                      <div key={log.id} className="p-3 bg-background/50 rounded-lg border border-border/50">
                        <p className="text-sm font-medium text-foreground">{displayText}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
