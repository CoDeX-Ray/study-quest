import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Bug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BugReport {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AdminBugReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load bug reports",
          variant: "destructive",
        });
      } else {
        // Fetch profile data separately
        const reportsWithProfiles = await Promise.all(
          (data || []).map(async (report) => {
            if (report.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", report.user_id)
                .single();
              return { ...report, profiles: profile };
            }
            return report;
          })
        );
        setReports(reportsWithProfiles as any);
      }
      setLoading(false);
    };

    if (isAdmin) {
      fetchReports();
    }
  }, [isAdmin, toast]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("bug_reports")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Bug report status updated",
      });
      setReports(reports.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "destructive";
      case "in_progress": return "default";
      case "resolved": return "secondary";
      default: return "default";
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
            <Bug className="h-10 w-10 text-warning" />
            Bug Reports
          </h1>
        </div>

        <div className="space-y-4">
          {reports.length === 0 ? (
            <Card className="p-8 text-center border-border/50 bg-surface">
              <p className="text-muted-foreground">No bug reports found</p>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="p-6 border-border/50 bg-surface">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">{report.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reported by: {report.profiles?.full_name || report.profiles?.email || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getPriorityColor(report.priority)}>
                      {report.priority}
                    </Badge>
                    <Badge variant={getStatusColor(report.status)}>
                      {report.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <p className="text-foreground mb-4">{report.description}</p>
                <div className="flex gap-2">
                  <Select
                    value={report.status}
                    onValueChange={(value) => updateStatus(report.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBugReports;
