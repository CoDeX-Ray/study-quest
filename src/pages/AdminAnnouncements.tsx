import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Create announcement post
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title,
          content,
          subject: "General",
          post_type: "announcement",
          category: "College",
          is_announcement: true
        })
        .select()
        .single();

      if (postError) throw postError;

      // Get all student and professional users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["student", "professional"]);

      if (profilesError) throw profilesError;

      // Create notifications for all users
      const notifications = profiles.map(profile => ({
        user_id: profile.id,
        title: `New Announcement: ${title}`,
        message: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
        type: "announcement",
        related_post_id: post.id
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) throw notifError;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Created announcement",
        details: { title, post_id: post.id }
      });

      toast.success("Announcement posted successfully!");
      setTitle("");
      setContent("");
    } catch (error) {
      console.error("Error posting announcement:", error);
      toast.error("Failed to post announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <Megaphone className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Post Announcement
          </h1>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your announcement..."
                rows={8}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Posting..." : "Post Announcement"}
            </Button>
          </form>
        </Card>

        <p className="text-sm text-muted-foreground mt-4 text-center">
          This announcement will be sent to all students and professionals
        </p>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
