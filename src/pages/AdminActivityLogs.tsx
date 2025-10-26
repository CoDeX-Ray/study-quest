import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const AdminActivityLogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load activity logs",
          variant: "destructive",
        });
      } else {
        // Fetch profile data separately
        const logsWithProfiles = await Promise.all(
          (data || []).map(async (log) => {
            if (log.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", log.user_id)
                .single();
              return { ...log, profiles: profile };
            }
            return log;
          })
        );
        setLogs(logsWithProfiles as any);
      }
      setLoading(false);
    };

    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin, toast]);

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
            <Activity className="h-10 w-10 text-accent" />
            Activity Logs
          </h1>
        </div>

        <div className="space-y-4">
          {logs.length === 0 ? (
            <Card className="p-8 text-center border-border/50 bg-surface">
              <p className="text-muted-foreground">No activity logs found</p>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="p-4 border-border/50 bg-surface">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{log.action}</p>
                    <p className="text-sm text-muted-foreground">
                      User: {log.profiles?.full_name || log.profiles?.email || "Unknown"}
                    </p>
                    {log.details && (
                      <pre className="text-xs text-muted-foreground mt-2 bg-background/50 p-2 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminActivityLogs;
