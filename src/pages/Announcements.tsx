import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, title, content, created_at, user_id")
        .eq("is_announcement", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for each post
      const announcementsWithProfiles = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", post.user_id)
            .single();

          return {
            ...post,
            profiles: profile || { full_name: "Admin" }
          };
        })
      );

      setAnnouncements(announcementsWithProfiles);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-8">
          📢 Announcements
        </h1>

        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-semibold mb-2">{announcement.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Posted by {announcement.profiles?.full_name || "Admin"} •{" "}
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-foreground/80 whitespace-pre-wrap">{announcement.content}</p>
            </Card>
          ))}
          {announcements.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No announcements yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
