import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Heart, MessageCircle, Share2, BookOpen, FileText, Video, Image as ImageIcon, Trash2, Ban, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ProfilePopup from "@/components/ProfilePopup";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Post {
  id: string;
  title: string;
  content: string;
  subject: string;
  post_type: string;
  created_at: string;
  user_id: string;
  file_url: string | null;
  category: string;
  department: string | null;
  is_announcement: boolean;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    level: number;
    status: string;
  };
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const Community = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<{ type: string; postId?: string; userId?: string; userName?: string; postTitle?: string } | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [linkCopied, setLinkCopied] = useState<string | null>(null);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const requireAuth = (action: () => void) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to interact with posts",
      });
      navigate("/auth");
      return;
    }
    action();
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch profiles, likes, and comments for each post
    const postsWithData = await Promise.all(
      (data || []).map(async (post) => {
        const [profileResult, likesResult, commentsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, avatar_url, level, status")
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

        const profile = profileResult.data || { full_name: "Unknown User", avatar_url: null, level: 1, status: "active" };
        // Handle case where table doesn't exist yet - return empty array
        const likes = (likesResult.error && likesResult.error.code === 'PGRST116') ? [] : (likesResult.data || []);
        const comments = commentsResult.data || [];
        // Check if current user has liked this post (works for both own posts and others' posts)
        const isLiked = user ? likes.some(like => like.user_id === user.id) : false;

        return {
          ...post,
          profiles: profile,
          likes_count: likes.length,
          comments_count: comments.length,
          is_liked: isLiked,
        };
      })
    );

    setPosts(postsWithData);
    setLoading(false);
  };

  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
      return;
    }

    const commentsWithProfiles = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", comment.user_id)
          .single();

        return {
          ...comment,
          profiles: profile || { full_name: "Unknown User", avatar_url: null },
        };
      })
    );

    setComments(prev => ({ ...prev, [postId]: commentsWithProfiles }));
  };

  const handleLike = async (postId: string, postTitle: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to like posts",
        variant: "destructive",
      });
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      if (post.is_liked) {
        // Unlike
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) {
          // Check if table doesn't exist
          if (error.code === 'PGRST116' || error.message?.includes('post_likes') || error.message?.includes('schema cache')) {
            toast({
              title: "Table Not Found",
              description: "The post_likes table doesn't exist. Please run the SQL migration in Supabase SQL Editor. See supabase/migrations/20250117000000_add_post_likes.sql",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message || "Failed to unlike post",
              variant: "destructive",
            });
          }
          return;
        }

        // Log activity
        await supabase
          .from("activity_logs")
          .insert({
            user_id: user.id,
            action: "Unliked post in Community",
            details: {
              post_id: postId,
              post_title: postTitle,
            },
          });
      } else {
        // Like
        const { error } = await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error) {
          // Check if table doesn't exist
          if (error.code === 'PGRST116' || error.message?.includes('post_likes') || error.message?.includes('schema cache')) {
            toast({
              title: "Table Not Found",
              description: "The post_likes table doesn't exist. Please run the SQL migration in Supabase SQL Editor. See supabase/migrations/20250117000000_add_post_likes.sql",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message || "Failed to like post",
              variant: "destructive",
            });
          }
          return;
        }

        // Log activity
        await supabase
          .from("activity_logs")
          .insert({
            user_id: user.id,
            action: "Liked post in Community",
            details: {
              post_id: postId,
              post_title: postTitle,
            },
          });
      }

      // Refresh posts to update like counts
      await fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleComment = async (postId: string, postTitle: string) => {
    if (!user || !commentText.trim()) return;

    const { error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: commentText.trim(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
      return;
    }

    // Log activity
    await supabase
      .from("activity_logs")
      .insert({
        user_id: user.id,
        action: "Commented on post in Community",
        details: {
          post_id: postId,
          post_title: postTitle,
          comment_preview: commentText.trim().substring(0, 100) + (commentText.trim().length > 100 ? "..." : ""),
        },
      });

    setCommentText("");
    fetchComments(postId);
    fetchPosts();
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Comment deleted successfully" });
      fetchComments(postId);
      
      // Update comment count
      const post = posts.find(p => p.id === postId);
      if (post) {
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, comments_count: Math.max((p.comments_count || 0) - 1, 0) }
            : p
        ));
      }
    }
  };

  const handleShare = async (postId: string, postTitle: string) => {
    if (!user) return;

    const postUrl = `${window.location.origin}/community?post=${postId}`;
    
    try {
      await navigator.clipboard.writeText(postUrl);
      setLinkCopied(postId);
      setTimeout(() => setLinkCopied(null), 2000);
      
      toast({
        title: "Link Copied!",
        description: "Post link has been copied to clipboard",
      });

      // Log activity
      await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action: "Shared post in Community",
          details: {
            post_id: postId,
            post_title: postTitle,
            share_url: postUrl,
          },
        });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async () => {
    if (!selectedAction?.postId || !user) return;

    const post = posts.find(p => p.id === selectedAction.postId);
    if (!post) return;

    // Log activity before deletion
    await supabase
      .from("activity_logs")
      .insert({
        user_id: user.id,
        action: "Deleted post in Community",
        details: {
          post_id: selectedAction.postId,
          post_title: post.title,
        },
      });

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", selectedAction.postId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Post deleted successfully" });
      fetchPosts();
    }
    setSelectedAction(null);
  };

  const handleBlockUser = async () => {
    if (!selectedAction?.userId) return;

    const { error } = await supabase
      .from("profiles")
      .update({ status: "blocked" })
      .eq("id", selectedAction.userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "User blocked successfully" });
      fetchPosts();
    }
    setSelectedAction(null);
  };

  const handleBanUser = async () => {
    if (!selectedAction?.userId) return;

    const { error } = await supabase
      .from("profiles")
      .update({ status: "banned" })
      .eq("id", selectedAction.userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "User banned successfully" });
      fetchPosts();
    }
    setSelectedAction(null);
  };

  const handleProfileClick = (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedUserId(userId);
    setProfilePopupOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf": return <FileText className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "document": return <BookOpen className="h-4 w-4" />;
      default: return <ImageIcon className="h-4 w-4" />;
    }
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      "Mathematics": "bg-blue-500/20 text-blue-400",
      "Physics": "bg-purple-500/20 text-purple-400",
      "Chemistry": "bg-green-500/20 text-green-400",
      "Biology": "bg-yellow-500/20 text-yellow-400",
      "History": "bg-red-500/20 text-red-400"
    };
    return colors[subject] || "bg-gray-500/20 text-gray-400";
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const filteredPosts = posts.filter(post => 
    searchQuery === "" || 
    post.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold font-gaming">Community</h1>
            <p className="text-muted-foreground">Share knowledge and learn together</p>
          </div>
          <Button 
            className="bg-game-green hover:bg-game-green-dark shadow-glow"
            onClick={() => requireAuth(() => navigate("/create-post"))}
          >
            <Plus className="h-4 w-4 mr-2" />
            Share Material
          </Button>
        </div>

        {/* Category Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, title, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <Card className="p-12 bg-gradient-card border-border/50 text-center">
              <p className="text-muted-foreground">No posts found. Try a different search.</p>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id} className="p-6 bg-gradient-card border-border/50 hover:border-game-green/30 transition-all duration-300">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={(e) => handleProfileClick(post.user_id, e)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="h-10 w-10 border-2 border-game-green/50">
                        <AvatarImage src={post.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-surface-elevated">
                          {post.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          onClick={(e) => handleProfileClick(post.user_id, e)}
                          className="font-semibold hover:text-primary transition-colors cursor-pointer"
                        >
                          {post.profiles?.full_name || 'Unknown User'}
                        </span>
                        <Badge variant="outline" className="text-xs border-level-gold/50 text-level-gold">
                          Level {post.profiles?.level || 1}
                        </Badge>
                        {post.is_announcement && (
                          <Badge className="bg-primary text-xs">Announcement</Badge>
                        )}
                        {post.profiles?.status && post.profiles.status !== 'active' && (
                          <Badge variant="destructive" className="text-xs">
                            {post.profiles.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{getTimeAgo(post.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(isAdmin || (user && post.user_id === user.id)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => requireAuth(() => setSelectedAction({ 
                          type: "deletePost", 
                          postId: post.id,
                          postTitle: post.title 
                        }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    {post.subject && (
                      <Badge className={getSubjectColor(post.subject)}>
                        {post.subject}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(post.post_type)}
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{post.content}</p>
                  
                  {/* File Attachment */}
                  {post.file_url && (
                    <div className="mt-3 p-4 bg-surface border border-border rounded-lg">
                      {post.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img 
                          src={post.file_url} 
                          alt="Post attachment" 
                          className="max-w-full rounded-lg max-h-96 object-contain"
                        />
                      ) : (
                        <a 
                          href={post.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <FileText className="w-4 h-4" />
                          View Attached File
                        </a>
                      )}
                    </div>
                  )}

                  {/* Category and Department */}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Badge variant="outline">{post.category}</Badge>
                    {post.department && (
                      <Badge variant="outline">{post.department}</Badge>
                    )}
                  </div>
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex items-center gap-6">
                    <button 
                      className={`flex items-center gap-2 transition-colors ${
                        post.is_liked 
                          ? "text-red-500 hover:text-red-600" 
                          : "text-muted-foreground hover:text-game-green"
                      }`}
                      onClick={() => handleLike(post.id, post.title)}
                    >
                      <Heart className={`h-4 w-4 ${post.is_liked ? "fill-current" : ""}`} />
                      <span className="text-sm">{post.likes_count || 0}</span>
                    </button>
                    
                    <Dialog open={commentDialogOpen === post.id} onOpenChange={(open) => {
                      setCommentDialogOpen(open ? post.id : null);
                      if (open) {
                        fetchComments(post.id);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <button 
                          className="flex items-center gap-2 text-muted-foreground hover:text-game-green transition-colors"
                          onClick={() => requireAuth(() => {})}
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm">{post.comments_count || 0}</span>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Comments</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Write a comment..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              rows={3}
                            />
                            <Button 
                              onClick={() => handleComment(post.id, post.title)}
                              disabled={!commentText.trim()}
                              className="w-full"
                            >
                              Post Comment
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {comments[post.id]?.map((comment) => (
                              <div key={comment.id} className="flex gap-3 p-3 bg-surface rounded-lg">
                                <div 
                                  onClick={(e) => handleProfileClick(comment.user_id, e)}
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {comment.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <span 
                                        onClick={(e) => handleProfileClick(comment.user_id, e)}
                                        className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer block"
                                      >
                                        {comment.profiles?.full_name || 'Unknown'}
                                      </span>
                                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(comment.created_at)}</p>
                                    </div>
                                    {user && user.id === comment.user_id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        onClick={() => {
                                          if (window.confirm("Are you sure you want to delete this comment?")) {
                                            handleDeleteComment(comment.id, post.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {(!comments[post.id] || comments[post.id].length === 0) && (
                              <p className="text-center text-muted-foreground py-4">No comments yet. Be the first to comment!</p>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <button 
                      className="flex items-center gap-2 text-muted-foreground hover:text-game-green transition-colors"
                      onClick={() => requireAuth(() => handleShare(post.id, post.title))}
                    >
                      {linkCopied === post.id ? (
                        <Check className="h-4 w-4 text-game-green" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                      <span className="text-sm">Share</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-500/50 hover:bg-orange-500/10"
                          onClick={() => setSelectedAction({ type: "block", userId: post.user_id, userName: post.profiles?.full_name })}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 hover:bg-red-500/10"
                          onClick={() => setSelectedAction({ type: "ban", userId: post.user_id, userName: post.profiles?.full_name })}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Profile Popup */}
      <ProfilePopup
        userId={selectedUserId}
        open={profilePopupOpen}
        onOpenChange={setProfilePopupOpen}
      />

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAction?.type === "deletePost" && "Delete Post"}
              {selectedAction?.type === "block" && "Block User"}
              {selectedAction?.type === "ban" && "Ban User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction?.type === "deletePost" && "Are you sure you want to delete this post? This action cannot be undone."}
              {selectedAction?.type === "block" && `Are you sure you want to block ${selectedAction?.userName}? They will not be able to post or interact.`}
              {selectedAction?.type === "ban" && `Are you sure you want to ban ${selectedAction?.userName}? This is a permanent action.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedAction?.type === "deletePost") handleDeletePost();
                if (selectedAction?.type === "block") handleBlockUser();
                if (selectedAction?.type === "ban") handleBanUser();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Community;
