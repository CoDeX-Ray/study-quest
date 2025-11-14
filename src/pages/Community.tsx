import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Heart, MessageCircle, Share2, BookOpen, FileText, Video, Image as ImageIcon, Trash2, Ban, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  profiles: {
    full_name: string;
    avatar_url: string | null;
    level: number;
    status: string;
  };
}

const Community = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<{ type: string; postId?: string; userId?: string; userName?: string } | null>(null);

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
  }, []);

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

    // Fetch profiles for each post
    const postsWithProfiles = await Promise.all(
      (data || []).map(async (post) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, level, status")
          .eq("id", post.user_id)
          .single();

        return {
          ...post,
          profiles: profile || { full_name: "Unknown User", avatar_url: null, level: 1, status: "active" }
        };
      })
    );

    setPosts(postsWithProfiles);
    setLoading(false);
  };

  const handleDeletePost = async () => {
    if (!selectedAction?.postId) return;

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

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["All", "Mathematics", "Physics", "Chemistry", "Biology", "History"].map((filter) => (
            <Button
              key={filter}
              variant={filter === "All" ? "default" : "outline"}
              className={filter === "All" ? "bg-game-green hover:bg-game-green-dark" : "border-border/50 hover:border-game-green/50"}
            >
              {filter}
            </Button>
          ))}
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <Card className="p-12 bg-gradient-card border-border/50 text-center">
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-6 bg-gradient-card border-border/50 hover:border-game-green/30 transition-all duration-300">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-game-green/50">
                      <AvatarImage src={post.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-surface-elevated">
                        {post.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{post.profiles?.full_name || 'Unknown User'}</span>
                        <Badge variant="outline" className="text-xs border-level-gold/50 text-level-gold">
                          Level {post.profiles?.level || 1}
                        </Badge>
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
                    <Badge className={getSubjectColor(post.subject)}>
                      {post.subject}
                    </Badge>
                  </div>
                </div>

                {/* Post Content */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(post.post_type)}
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{post.content}</p>
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex items-center gap-6">
                    <button 
                      className="flex items-center gap-2 text-muted-foreground hover:text-game-green transition-colors"
                      onClick={() => requireAuth(() => console.log("Like post"))}
                    >
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">0</span>
                    </button>
                    <button 
                      className="flex items-center gap-2 text-muted-foreground hover:text-game-green transition-colors"
                      onClick={() => requireAuth(() => console.log("Comment on post"))}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">0</span>
                    </button>
                    <button 
                      className="flex items-center gap-2 text-muted-foreground hover:text-game-green transition-colors"
                      onClick={() => requireAuth(() => console.log("Share post"))}
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="text-sm">0</span>
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
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedAction({ type: "delete", postId: post.id })}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAction?.type === "delete" && "Delete Post"}
              {selectedAction?.type === "block" && "Block User"}
              {selectedAction?.type === "ban" && "Ban User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction?.type === "delete" && "Are you sure you want to delete this post? This action cannot be undone."}
              {selectedAction?.type === "block" && `Are you sure you want to block ${selectedAction?.userName}? They will not be able to post or interact.`}
              {selectedAction?.type === "ban" && `Are you sure you want to ban ${selectedAction?.userName}? This is a permanent action.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedAction?.type === "delete") handleDeletePost();
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