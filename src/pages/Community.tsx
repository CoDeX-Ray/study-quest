import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  ThumbsUp,
  MessageCircle,
  Search,
  Share2,
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";

interface ProfileSummary {
  id: string;
  full_name: string | null;
}

interface PostLike {
  post_id: string;
  user_id: string;
}

interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: {
    full_name: string | null;
  } | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  subject: string;
  category: string;
  department: string | null;
  created_at: string;
  is_announcement: boolean;
  user_id: string;
  profiles: ProfileSummary | null;
  post_likes: PostLike[];
  post_comments: PostComment[];
}

const Community = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<ProfileSummary | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, title, content, subject, category, department, created_at, is_announcement, user_id")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      const postIds = postsData.map((post) => post.id);

      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds),
        supabase
          .from("post_comments")
          .select("id, post_id, user_id, content, created_at")
          .in("post_id", postIds)
          .order("created_at", { ascending: true }),
      ]);

      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;

      const commentAuthorIds = (commentsResult.data || []).map((comment) => comment.user_id);
      const authorIds = Array.from(
        new Set([
          ...postsData.map((post) => post.user_id),
          ...commentAuthorIds,
        ])
      );

      let profilesData: ProfileSummary[] = [];
      if (authorIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);

        if (profilesError) throw profilesError;
        profilesData = profiles || [];
      }

      const profileMap = new Map<string, ProfileSummary>(
        profilesData.map((profile) => [profile.id, profile])
      );

      const postsWithRelations: Post[] = postsData.map((post) => ({
        ...post,
        profiles: profileMap.get(post.user_id) || null,
        post_likes: (likesResult.data || []).filter((like) => like.post_id === post.id),
        post_comments: (commentsResult.data || [])
          .filter((comment) => comment.post_id === post.id)
          .map((comment) => ({
            ...comment,
            author: profileMap.get(comment.user_id) || null,
          })),
      }));

      setPosts(postsWithRelations);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, user?.id]);

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      if (!user) {
        setCurrentProfile(null);
        setCommentInputs({});
        setOpenComments({});
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setCurrentProfile(data);
      }
    };

    fetchCurrentProfile();
  }, [user?.id]);

  const redirectToAuth = (message: string) => {
    toast.error(message);
    navigate("/auth");
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      redirectToAuth("Please sign in to like posts");
      return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const hasLiked = post.post_likes.some((like) => like.user_id === user.id);

    try {
      if (hasLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "Unliked post",
          details: { post_id: postId, post_title: post.title },
        });
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "Liked post",
          details: { post_id: postId, post_title: post.title },
        });

        if (post.user_id !== user.id) {
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            title: `${currentProfile?.full_name || "Someone"} liked your post`,
            message: `${post.title} received a new like.`,
            type: "like",
            related_post_id: post.id,
          });
        }
      }

      await fetchPosts();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  const handleCommentToggle = (postId: string) => {
    if (!user) {
      redirectToAuth("Please sign in to view and add comments");
      return;
    }

    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!user) {
      redirectToAuth("Please sign in to comment");
      return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const content = (commentInputs[postId] || "").trim();
    if (!content) {
      toast.error("Please enter a comment before posting");
      return;
    }

    setCommentLoading((prev) => ({ ...prev, [postId]: true }));

    try {
      await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content,
      });

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Commented on post",
        details: {
          post_id: postId,
          post_title: post.title,
        },
      });

      if (post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          title: `${currentProfile?.full_name || "Someone"} commented on your post`,
          message: content.length > 80 ? `${content.slice(0, 80)}...` : content,
          type: "comment",
          related_post_id: post.id,
        });
      }

      toast.success("Comment posted");
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      await fetchPosts();
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleShare = async (post: Post) => {
    if (!user) {
      redirectToAuth("Please sign in to share posts");
      return;
    }

    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/community#post-${post.id}`
        : `/community#post-${post.id}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.content.slice(0, 120),
          url: shareUrl,
        });
        toast.success("Post shared successfully");
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Post link copied to clipboard");
      } else {
        toast.error("Sharing is not supported in this browser");
        return;
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Shared post",
        details: {
          post_id: post.id,
          post_title: post.title,
          share_url: shareUrl,
        },
      });

      if (post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          title: `${currentProfile?.full_name || "Someone"} shared your post`,
          message: `${post.title} was shared with others.`,
          type: "share",
          related_post_id: post.id,
        });
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error("Error sharing post:", error);
      toast.error("Unable to share post");
    }
  };

  const filteredPosts = posts.filter((post) => {
    const normalizedQuery = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(normalizedQuery) ||
      post.content.toLowerCase().includes(normalizedQuery) ||
      (post.subject || "").toLowerCase().includes(normalizedQuery)
    );
  });

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
            const hasLiked =
              user && post.post_likes.some((like) => like.user_id === user.id);
            const commentsOpen = openComments[post.id];

            return (
              <Card
                key={post.id}
                id={`post-${post.id}`}
                className="p-6 hover:shadow-lg transition-shadow"
              >
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
                      {post.subject || "General"}
                    </span>
                    <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm">
                      {post.category || "General"}
                    </span>
                  </div>
                </div>
                <p className="text-foreground/80 mb-4">{post.content}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className={`gap-2 ${hasLiked ? "text-primary" : ""}`}
                    onClick={() => handleLike(post.id)}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${hasLiked ? "fill-primary" : ""}`}
                    />
                    {likesCount}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className={`gap-2 ${commentsOpen ? "text-primary" : ""}`}
                    onClick={() => handleCommentToggle(post.id)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {commentsCount}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="gap-2"
                    onClick={() => handleShare(post)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>

                {commentsOpen && (
                  <div className="mt-4 border-t border-border/50 pt-4 space-y-4">
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {post.post_comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No comments yet. Start the conversation!
                        </p>
                      ) : (
                        post.post_comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-lg bg-surface/70 p-3 border border-border/30"
                          >
                            <div className="flex items-center justify-between text-sm font-semibold">
                              <span>{comment.author?.full_name || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/80 mt-1">
                              {comment.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add your comment..."
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        disabled={commentLoading[post.id]}
                      />
                      <Button
                        type="button"
                        onClick={() => handleCommentSubmit(post.id)}
                        disabled={commentLoading[post.id]}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {commentLoading[post.id] ? "Posting..." : "Send"}
                      </Button>
                    </div>
                  </div>
                )}
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
