import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Megaphone,
  MessageCircle,
  Share2,
  ThumbsUp,
  Send,
  Loader2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Post, ProfileSummary } from "@/types/community";
import { loadPostsWithRelations } from "@/utils/communityFeed";
import AttachmentPreview from "@/components/AttachmentPreview";
import ProfilePopup from "@/components/ProfilePopup";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const PAGE_SIZE = 6;

const generateTempId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const Announcements = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [shareLoading, setShareLoading] = useState<Record<string, boolean>>({});
  const [likeAnimations, setLikeAnimations] = useState<Record<string, boolean>>({});
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<ProfileSummary | null>(null);
  const [commentDeleting, setCommentDeleting] = useState<Record<string, boolean>>({});
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  const fetchAnnouncements = useCallback(
    async ({ offset = 0, replace = false }: { offset?: number; replace?: boolean } = {}) => {
      const isInitial = offset === 0 || replace;
      if (isInitial) {
        setLoading(true);
      } else {
        setFetchingMore(true);
      }
      try {
        const data = await loadPostsWithRelations({
          announcementsOnly: true,
          from: offset,
          limit: PAGE_SIZE,
        });
        setAnnouncements((prev) => {
          if (isInitial) return data;
          const existingIds = new Set(prev.map((item) => item.id));
          const merged = [...prev];
          data.forEach((item) => {
            if (!existingIds.has(item.id)) {
              merged.push(item);
            }
          });
          return merged;
        });
        setHasMore(data.length === PAGE_SIZE);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        toast.error("Failed to load announcements");
      } finally {
        if (isInitial) {
          setLoading(false);
        } else {
          setFetchingMore(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchAnnouncements({ replace: true });
  }, [fetchAnnouncements]);

  const location = useLocation();

  useEffect(() => {
    // Support shared links in HashRouter: look for ?post=ID in hash route
    const scrollToPostFromLocation = () => {
      try {
        const params = new URLSearchParams(location.search);
        const postId = params.get("post");
        if (postId) {
          setTimeout(() => {
            const element = document.getElementById(`post-${postId}`);
            if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 150);
        }
      } catch (e) {
        // ignore
      }
    };

    scrollToPostFromLocation();
  }, [location, announcements]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setCurrentProfile(null);
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

    loadProfile();
  }, [user?.id]);

  const redirectToAuth = (message: string) => {
    toast.error(message);
    navigate("/auth");
  };

  const triggerLikeAnimation = (postId: string) => {
    setLikeAnimations((prev) => ({ ...prev, [postId]: true }));
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      setLikeAnimations((prev) => {
        const nextState = { ...prev };
        delete nextState[postId];
        return nextState;
      });
    }, 600);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      redirectToAuth("Please sign in to react to announcements");
      return;
    }

    const post = announcements.find((p) => p.id === postId);
    if (!post) return;

    const hasLiked = post.post_likes.some((like) => like.user_id === user.id);
    const previousState = announcements;

    setAnnouncements((prev) =>
      prev.map((announcement) => {
        if (announcement.id !== postId) return announcement;
        const updatedLikes = hasLiked
          ? announcement.post_likes.filter((like) => like.user_id !== user.id)
          : [...announcement.post_likes, { post_id: postId, user_id: user.id }];
        if (!hasLiked) {
          triggerLikeAnimation(postId);
        }
        return { ...announcement, post_likes: updatedLikes };
      })
    );

    try {
      if (hasLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });

        // Notify admin owner if different user
        if (post.user_id !== user.id) {
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            title: `${currentProfile?.full_name || "Someone"} liked your announcement`,
            message: `${post.title} received a new like.`,
            type: "announcement_like",
            related_post_id: post.id,
          });
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Unable to update reaction");
      setAnnouncements(previousState);
    }
  };

  const handleCommentToggle = (postId: string) => {
    if (!user) {
      redirectToAuth("Please sign in to join the discussion");
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

    const post = announcements.find((p) => p.id === postId);
    if (!post) return;

    const content = (commentInputs[postId] || "").trim();
    if (!content) {
      toast.error("Please enter a comment");
      return;
    }

    setCommentLoading((prev) => ({ ...prev, [postId]: true }));

    try {
      const post = announcements.find((p) => p.id === postId);
      if (!post) return;

      const { data: insertedComment, error: insertError } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
        })
        .select("id, created_at")
        .single();

      if (insertError) throw insertError;

      toast.success("Comment added");
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      setAnnouncements((prev) =>
        prev.map((announcement) =>
          announcement.id === postId
            ? {
                ...announcement,
                post_comments: [
                  ...announcement.post_comments,
                  {
                    id: insertedComment?.id || generateTempId(),
                    post_id: postId,
                    user_id: user.id,
                    content,
                    created_at: insertedComment?.created_at || new Date().toISOString(),
                    author: currentProfile,
                  },
                ],
              }
            : announcement
        )
      );

      if (post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          title: `${currentProfile?.full_name || "Someone"} commented on your announcement`,
          message: content.length > 80 ? `${content.slice(0, 80)}...` : content,
          type: "announcement_comment",
          related_post_id: postId,
        });
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Unable to post comment");
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleShare = async (post: Post) => {
    if (!user) {
      redirectToAuth("Please sign in to share announcements");
      return;
    }

    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/#/announcements?post=${post.id}`
        : `/#/announcements?post=${post.id}`;

    setShareLoading((prev) => ({ ...prev, [post.id]: true }));

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.content.slice(0, 120),
          url: shareUrl,
        });
        toast.success("Announcement shared");
      } else if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
      } else {
        toast.error("Sharing is not supported");
      }

      if (post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          title: `${currentProfile?.full_name || "Someone"} shared your announcement`,
          message: `${post.title} was shared with others.`,
          type: "announcement_share",
          related_post_id: post.id,
        });
      }
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) {
      redirectToAuth("Please sign in to delete comments");
      return;
    }

    const announcement = announcements.find((a) => a.id === postId);
    const comment = announcement?.post_comments.find((c) => c.id === commentId);
    if (!announcement || !comment) return;

    if (
      comment.user_id !== user.id &&
      announcement.user_id !== user.id &&
      !isAdmin
    ) {
      toast.error("You can only delete your own comments");
      return;
    }

    if (typeof window !== "undefined" && !window.confirm("Delete this comment?")) {
      return;
    }

    const previousState = announcements;
    setCommentDeleting((prev) => ({ ...prev, [commentId]: true }));
    setAnnouncements((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              post_comments: post.post_comments.filter((c) => c.id !== commentId),
            }
          : post
      )
    );

    try {
      await supabase.from("post_comments").delete().eq("id", commentId);
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Unable to delete comment");
      setAnnouncements(previousState);
    } finally {
      setCommentDeleting((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }
  };

  const handleDeleteAnnouncement = async (postId: string) => {
    if (!user || !isAdmin) {
      toast.error("Only admins can delete announcements");
      return;
    }

    if (typeof window !== "undefined" && !window.confirm("Delete this announcement?")) {
      return;
    }

    const previousState = announcements;
    setDeletingPostId(postId);
    setAnnouncements((prev) => prev.filter((post) => post.id !== postId));

    try {
      await supabase.from("posts").delete().eq("id", postId);
      toast.success("Announcement removed");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Unable to delete announcement");
      setAnnouncements(previousState);
    } finally {
      setDeletingPostId(null);
    }
  };

    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error("Error sharing announcement:", error);
        toast.error("Unable to share announcement");
      }
    } finally {
      setShareLoading((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="community-shell">
      <div className="community-halo community-halo-one animate-gradient-slow" />
      <div className="community-halo community-halo-two animate-gradient-slow" />
      <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 max-w-5xl space-y-6 md:space-y-8">
        <section className="community-panel rounded-3xl p-4 sm:p-6 md:p-10 shadow-glow">
          <div className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-[0.35em] text-primary/70 flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Official Broadcasts
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Campus-Wide Announcements
            </h1>
            <p className="text-muted-foreground max-w-3xl">
              Stay in sync with every admin alert. React, ask questions, and keep the conversation flowing with your fellow learners.
            </p>
          </div>
        </section>

        <div className="space-y-6">
          {announcements.map((announcement) => {
            const likesCount = announcement.post_likes.length;
            const commentsCount = announcement.post_comments.length;
            const hasLiked =
              user && announcement.post_likes.some((like) => like.user_id === user.id);
            const commentsOpen = openComments[announcement.id];

            return (
              <Card
                key={announcement.id}
                id={`post-${announcement.id}`}
                className="community-card relative overflow-hidden p-4 sm:p-6 md:p-8"
              >
                <div className="community-card-glow" />
                <div className="relative z-10 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-primary/70">
                          Announcement
                        </p>
                        <h2 className="text-2xl font-semibold">{announcement.title}</h2>
                        <button
                          type="button"
                          onClick={() => handleProfileView(announcement.user_id)}
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          {announcement.profiles?.full_name || "Admin"}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{new Date(announcement.created_at).toLocaleString()}</span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            disabled={deletingPostId === announcement.id}
                            aria-label="Delete announcement"
                          >
                            {deletingPostId === announcement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                  <p className="text-foreground/80 whitespace-pre-line leading-relaxed">
                    {announcement.content}
                  </p>

                  {announcement.file_url && (
                    <AttachmentPreview
                      fileUrl={announcement.file_url}
                      contextTitle={announcement.title}
                      isAccessible={!!user}
                      onRequestAccess={() =>
                        redirectToAuth("Please sign in to view and download attachments")
                      }
                    />
                  )}

                  <div className="flex flex-wrap gap-3 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className={`relative gap-2 rounded-full px-4 ${
                        hasLiked ? "text-primary" : "text-muted-foreground"
                      }`}
                      onClick={() => handleLike(announcement.id)}
                    >
                      <span
                        className={`like-spark ${
                          likeAnimations[announcement.id]
                            ? "opacity-100 like-spark-active"
                            : "opacity-0"
                        }`}
                      >
                        +1
                      </span>
                      <ThumbsUp
                        className={`h-4 w-4 ${
                          hasLiked ? "fill-primary" : ""
                        } ${likeAnimations[announcement.id] ? "like-pop" : ""}`}
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
                      onClick={() => handleCommentToggle(announcement.id)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {commentsCount}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="gap-2 rounded-full px-4 text-muted-foreground hover:text-foreground"
                      onClick={() => handleShare(announcement)}
                      disabled={shareLoading[announcement.id]}
                    >
                      {shareLoading[announcement.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                      {shareLoading[announcement.id] ? "Sharing..." : "Share"}
                    </Button>
                  </div>

                  {commentsOpen && (
                    <div className="community-comments space-y-4">
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {announcement.post_comments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No comments yet. Start the conversation!
                          </p>
                        ) : (
                          announcement.post_comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="rounded-2xl bg-surface/70 p-3 border border-white/5"
                            >
                              <div className="flex items-center justify-between text-sm font-semibold">
                                <span>{comment.author?.full_name || "Unknown"}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                                  {(comment.user_id === user?.id ||
                                    announcement.user_id === user?.id ||
                                    isAdmin) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-muted-foreground hover:text-destructive"
                                      onClick={() =>
                                        handleDeleteComment(announcement.id, comment.id)
                                      }
                                      disabled={!!commentDeleting[comment.id]}
                                      aria-label="Delete comment"
                                    >
                                      {commentDeleting[comment.id] ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  )}
                                </div>
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
                          value={commentInputs[announcement.id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [announcement.id]: e.target.value,
                            }))
                          }
                          disabled={commentLoading[announcement.id]}
                          className="bg-transparent border border-white/10 focus-visible:ring-primary/40"
                        />
                        <Button
                          type="button"
                          onClick={() => handleCommentSubmit(announcement.id)}
                          disabled={commentLoading[announcement.id]}
                          className="gap-2 shadow-glow"
                        >
                          <Send className="h-4 w-4" />
                          {commentLoading[announcement.id] ? "Posting..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

          {announcements.length === 0 && (
            <Card className="community-panel text-center py-12 space-y-2">
              <p className="text-lg font-semibold">No announcements yet</p>
              <p className="text-muted-foreground">
                Check back later or enable notifications to stay updated.
              </p>
            </Card>
          )}
          {announcements.length > 0 && hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => fetchAnnouncements({ offset: announcements.length })}
                disabled={fetchingMore}
              >
                {fetchingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  "Load more announcements"
                )}
              </Button>
            </div>
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

export default Announcements;
