import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Megaphone, Sparkles, Users, Activity, Loader2 } from "lucide-react";
import { loadPostsWithRelations } from "@/utils/communityFeed";
import AttachmentPreview from "@/components/AttachmentPreview";
import { Post } from "@/types/community";

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Post[]>([]);
  const [previewing, setPreviewing] = useState(false);

  const fetchAudienceCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("role", ["student", "professional", "admin"]);

    if (error) {
      console.error("Error fetching audience count:", error);
      return;
    }

    if (typeof count === "number") {
      setAudienceCount(count);
    }
  }, []);

  const fetchRecentAnnouncements = useCallback(async () => {
    try {
      const posts = await loadPostsWithRelations({ announcementsOnly: true, limit: 4 });
      setRecentAnnouncements(posts.slice(0, 4));
    } catch (error) {
      console.error("Error loading recent announcements:", error);
    }
  }, []);

  useEffect(() => {
    fetchAudienceCount();
    fetchRecentAnnouncements();
  }, [fetchAudienceCount, fetchRecentAnnouncements]);

  const fallbackFanOut = async (
    postId: string,
    announcementTitle: string,
    announcementContent: string
  ) => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["student", "professional"]);

    if (error || !profiles) {
      throw error || new Error("Unable to load recipients");
    }

    const notifications = profiles.map((profile) => ({
      user_id: profile.id,
      title: `New Announcement: ${announcementTitle}`,
      message:
        announcementContent.substring(0, 140) +
        (announcementContent.length > 140 ? "..." : ""),
      type: "announcement",
      related_post_id: postId,
    }));

    // Insert in manageable chunks
    const CHUNK_SIZE = 500;
    for (let i = 0; i < notifications.length; i += CHUNK_SIZE) {
      const chunk = notifications.slice(i, i + CHUNK_SIZE);
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(chunk);
      if (insertError) throw insertError;
    }
  };

  const broadcastAnnouncement = async (
    postId: string,
    announcementTitle: string,
    announcementContent: string
  ) => {
    const { error } = await supabase.rpc("broadcast_announcement_notifications", {
      p_post_id: postId,
      p_title: announcementTitle,
      p_message: announcementContent,
    });

    if (error) {
      console.warn("RPC broadcast failed, falling back to client fan-out:", error);
      await fallbackFanOut(postId, announcementTitle, announcementContent);
    }
  };

  const insertAnnouncementPost = async (postType: "announcement" | "idea") => {
    return supabase
      .from("posts")
      .insert({
        user_id: user?.id,
        title,
        content,
        subject: "General",
        post_type: postType,
        category: "College",
        is_announcement: true,
      })
      .select()
      .single();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      let postType: "announcement" | "idea" = "announcement";
      let postError = null;
      let post = null;

      const attemptInsert = async () => {
        const { data, error } = await insertAnnouncementPost(postType);
        post = data;
        postError = error;
      };

      await attemptInsert();

      if (
        postError &&
        (postError.message?.includes("post_type") ||
          postError.details?.includes("post_type") ||
          postError.message?.toLowerCase().includes("constraint") ||
          postError.code === "23514")
      ) {
        console.warn(
          "Announcement post_type constraint triggered, falling back to 'idea' for compatibility."
        );
        postType = "idea";
        await attemptInsert();
      }

      if (postError || !post) throw postError || new Error("Unable to create announcement");

      await broadcastAnnouncement(post.id, title, content);

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Created announcement",
        details: { title, post_id: post.id },
      });

      toast.success("Announcement posted successfully!");
      setTitle("");
      setContent("");
      fetchRecentAnnouncements();
      fetchAudienceCount();
    } catch (error: any) {
      console.error("Error posting announcement:", error);
      toast.error(
        typeof error?.message === "string"
          ? `Failed to post announcement: ${error.message}`
          : "Failed to post announcement"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <header className="rounded-3xl p-6 sm:p-10 community-panel relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/10 blur-3xl opacity-60" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-primary/70 mb-4 flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Broadcast Center
              </p>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                Reach every learner with a single post
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl">
                Craft important updates and we’ll deliver them to students, professionals, and admins—complete with notifications and community reactions.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[220px]">
              <Card className="p-4 bg-black/20 border-border/50">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-muted-foreground mb-2">
                  <span>Audience</span>
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold">{audienceCount ?? "––"}</p>
                <p className="text-xs text-muted-foreground mt-1">Recipients</p>
              </Card>
              <Card className="p-4 bg-black/20 border-border/50">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-muted-foreground mb-2">
                  <span>Signal</span>
                  <Activity className="h-4 w-4 text-accent" />
                </div>
                <p className="text-2xl font-semibold">{recentAnnouncements.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Recent posts</p>
              </Card>
            </div>
          </div>
        </header>

        <Card className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Midterm Week Schedule"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Preview Mode</label>
                <Button
                  type="button"
                  variant={previewing ? "default" : "secondary"}
                  className="w-full"
                  onClick={() => setPreviewing((prev) => !prev)}
                >
                  {previewing ? "Hide Preview" : "Show Preview"}
                </Button>
              </div>
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

            {previewing && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6 space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Live Preview
                </p>
                <h3 className="text-2xl font-semibold">{title || "Announcement Title"}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleString()} • Admin Broadcast
                </p>
                <p className="text-foreground/80 whitespace-pre-wrap mt-3">
                  {content || "Write a message to preview it here..."}
                </p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Megaphone className="h-4 w-4" />
                  Post Announcement
                </>
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center">
            We’ll notify every admin, student, and professional instantly.
          </p>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent broadcasts</h2>
            <Button variant="ghost" size="sm" onClick={fetchRecentAnnouncements}>
              Refresh
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {recentAnnouncements.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground">
                No announcements yet
              </Card>
            )}
            {recentAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="p-6 bg-gradient-to-br from-black/30 to-transparent border-border/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-primary/70 mb-1">
                      Announcement
                    </p>
                    <h3 className="text-xl font-semibold">{announcement.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {announcement.profiles?.full_name || "Admin"}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 line-clamp-4 whitespace-pre-wrap">
                  {announcement.content}
                </p>
                {announcement.file_url && (
                  <AttachmentPreview
                    fileUrl={announcement.file_url}
                    contextTitle={announcement.title}
                    className="border-white/5 bg-black/10"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  asChild
                >
                  <a href={`/community#post-${announcement.id}`}>View in community</a>
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
