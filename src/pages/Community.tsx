import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  ThumbsUp,
  MessageCircle,
  Search,
  Share2,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import ProfilePopup from "@/components/ProfilePopup";

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
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [likeAnimations, setLikeAnimations] = useState<Record<string, boolean>>({});

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

        triggerLikeAnimation(postId);

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

  const triggerLikeAnimation = (postId: string) => {
    setLikeAnimations((prev) => ({ ...prev, [postId]: true }));
    window.setTimeout(() => {
      setLikeAnimations((prev) => {
        const nextState = { ...prev };
        delete nextState[postId];
        return nextState;
      });
    }, 600);
  };

  const handleProfileView = (profileId: string | null) => {
    if (!profileId) return;
    setSelectedProfileId(profileId);
    setIsProfilePopupOpen(true);
  };

  const handleProfilePopupChange = (open: boolean) => {
    setIsProfilePopupOpen(open);
    if (!open) {
      setSelectedProfileId(null);
    }
  };

  const scrollToPosts = () => {
    if (typeof document === "undefined") return;
    document
      .getElementById("community-posts")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const totalLikes = posts.reduce((sum, post) => sum + post.post_likes.length, 0);
  const totalComments = posts.reduce((sum, post) => sum + post.post_comments.length, 0);
  const uniqueContributors = new Set(posts.map((post) => post.user_id)).size;
  const communityStats = [
    {
      label: "Active posts",
      value: posts.length,
      description: "Fresh study drops",
      Icon: Sparkles,
    },
    {
      label: "Appreciations",
      value: totalLikes,
      description: "Likes sent",
      Icon: ThumbsUp,
    },
    {
      label: "Contributors",
      value: uniqueContributors,
      description: "Learners sharing",
      Icon: Users,
    },
    {
      label: "Discussions",
      value: totalComments,
      description: "Ideas exchanged",
      Icon: MessageCircle,
    },
  ];

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
    <div className="community-shell">
      <div className="community-halo community-halo-one animate-gradient-slow" />
      <div className="community-halo community-halo-two animate-gradient-slow" />

      <div className="relative z-10 container mx-auto px-4 py-10 max-w-5xl space-y-8">
        <section className="community-panel rounded-3xl p-6 sm:p-10 shadow-glow">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-primary/70 mb-3">
                Share & Inspire
              </p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                Community Hub
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Trade notes, celebrate wins, and keep your study streak alive with
                fellow Questers.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                {user && !isAdmin ? (
                  <Link to="/create-post">
                    <Button className="gap-2 shadow-glow">
                      <Plus className="h-4 w-4" />
                      Share Material
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="gap-2 shadow-glow"
                    onClick={() => {
                      if (!user) {
                        navigate("/auth");
                        return;
                      }
                      scrollToPosts();
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    {user ? "Browse Community" : "Join StudyQuest"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  type="button"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                  onClick={scrollToPosts}
                >
                  <Share2 className="h-4 w-4" />
                  Explore posts
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {communityStats.map(({ label, value, description, Icon }) => (
                <Card key={label} className="community-stat-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
                      {label}
                    </span>
                  </div>
                    <p className="text-3xl font-semibold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Card className="community-panel p-0 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
          <div className="p-4 sm:p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject, title, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-transparent border border-white/10 focus-visible:ring-primary/40"
              />
            </div>
          </div>
        </Card>

        <div id="community-posts" className="space-y-6 pb-16">
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
                className="community-card relative overflow-hidden p-6 sm:p-8 transition-all duration-500 hover:-translate-y-1"
              >
                <div className="community-card-glow" />
                <div className="relative z-10 space-y-5">
                  {post.is_announcement && (
                    <div className="announcement-pill">
                      📢 Announcement
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Badge variant="outline" className="community-chip">
                      {post.subject || "General"}
                    </Badge>
                    <Badge variant="outline" className="community-chip">
                      {post.category || "General"}
                    </Badge>
                    {post.department && (
                      <Badge variant="outline" className="community-chip">
                        {post.department}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold leading-tight">{post.title}</h3>
                      <button
                        type="button"
                        onClick={() => handleProfileView(post.user_id)}
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Posted by {post.profiles?.full_name || "Unknown"}
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>

                  <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>

                  <div className="flex flex-wrap gap-3 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className={`relative gap-2 rounded-full px-4 ${hasLiked ? "text-primary" : "text-muted-foreground"}`}
                      onClick={() => handleLike(post.id)}
                    >
                      <span
                        className={`like-spark ${
                          likeAnimations[post.id] ? "opacity-100 like-spark-active" : "opacity-0"
                        }`}
                      >
                        +1
                      </span>
                      <ThumbsUp
                        className={`h-4 w-4 transition-transform ${hasLiked ? "fill-primary" : ""} ${
                          likeAnimations[post.id] ? "like-pop" : ""
                        }`}
                      />
                      {likesCount}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className={`gap-2 rounded-full px-4 ${
                        commentsOpen ? "text-primary" : "text-muted-foreground"
                      }`}
                      onClick={() => handleCommentToggle(post.id)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {commentsCount}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="gap-2 rounded-full px-4 text-muted-foreground hover:text-foreground"
                      onClick={() => handleShare(post)}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>

                  {commentsOpen && (
                    <div className="community-comments space-y-4">
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {post.post_comments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No comments yet. Start the conversation!
                          </p>
                        ) : (
                          post.post_comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="rounded-2xl bg-surface/70 p-3 border border-white/5"
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
                      <div className="flex flex-col gap-3 sm:flex-row">
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
                          className="bg-transparent border border-white/10 focus-visible:ring-primary/40"
                        />
                        <Button
                          type="button"
                          onClick={() => handleCommentSubmit(post.id)}
                          disabled={commentLoading[post.id]}
                          className="gap-2 shadow-glow"
                        >
                          <Send className="h-4 w-4" />
                          {commentLoading[post.id] ? "Posting..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          {filteredPosts.length === 0 && (
            <Card className="community-panel text-center py-12 space-y-2">
              <p className="text-lg font-semibold">No posts found</p>
              <p className="text-muted-foreground">Try adjusting your search terms.</p>
            </Card>
          )}
        </div>
      </div>

      <ProfilePopup
        userId={selectedProfileId}
        open={isProfilePopupOpen}
        onOpenChange={handleProfilePopupChange}
      />
    </div>
  );
};

export default Community;
