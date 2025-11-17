import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Plus, ThumbsUp, MessageCircle, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";

interface Post {
  id: string;
  title: string;
  content: string;
  subject: string;
  category: string;
  created_at: string;
  is_announcement: boolean;
  user_id: string;
  profiles: {
    full_name: string;
  } | null;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
}

const Community = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, title, content, subject, category, created_at, is_announcement, user_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch additional data for each post
      const postsWithData = await Promise.all(
        (postsData || []).map(async (post) => {
          const [profileResult, likesResult, commentsResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name")
              .eq("id", post.user_id)
              .single(),
            supabase
              .from("post_likes")
              .select("user_id")
              .eq("post_id", post.id),
            supabase
              .from("post_comments")
              .select("id")
              .eq("post_id", post.id),
          ]);

          return {
            ...post,
            profiles: profileResult.data || null,
            post_likes: likesResult.data || [],
            post_comments: commentsResult.data || [],
          };
        })
      );

      setPosts(postsWithData);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      const hasLiked = post?.post_likes.some(like => like.user_id === user.id);

      if (hasLiked) {
        // Unlike
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        
        // Log activity
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "Unliked post",
          details: { post_id: postId, post_title: post?.title }
        });
      } else {
        // Like
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
        
        // Log activity
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "Liked post",
          details: { post_id: postId, post_title: post?.title }
        });
      }

      fetchPosts();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Community
          </h1>
          {user && !isAdmin && (
            <Link to="/create-post">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Share Material
              </Button>
            </Link>
          )}
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject, title, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const likesCount = post.post_likes.length;
            const commentsCount = post.post_comments.length;
            const hasLiked = user && post.post_likes.some(like => like.user_id === user.id);

            return (
              <Card key={post.id} className="p-6 hover:shadow-lg transition-shadow">
                {post.is_announcement && (
                  <div className="mb-2 inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                    📢 Announcement
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Posted by {post.profiles?.full_name || "Unknown"} •{" "}
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm">
                      {post.subject}
                    </span>
                    <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm">
                      {post.category}
                    </span>
                  </div>
                </div>
                <p className="text-foreground/80 mb-4">{post.content}</p>
                <div className="flex gap-4 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${hasLiked ? 'text-primary' : ''}`}
                    onClick={() => handleLike(post.id)}
                  >
                    <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-primary' : ''}`} />
                    {likesCount}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {commentsCount}
                  </Button>
                </div>
              </Card>
            );
          })}
          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;
