import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [postType, setPostType] = useState<"material" | "strategy" | "idea">("material");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    // Calculate XP based on post type
    let xpEarned = 0;
    if (postType === "material") xpEarned = 50;
    else if (postType === "strategy") xpEarned = 30;
    else if (postType === "idea") xpEarned = 20;

    try {
      // Insert post
      const { error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title,
          content,
          subject,
          post_type: postType,
        });

      if (postError) throw postError;

      // Update user XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp, level")
        .eq("id", user.id)
        .single();

      if (profile) {
        const newXP = profile.xp + xpEarned;
        const newLevel = Math.floor(newXP / 100) + 1;

        await supabase
          .from("profiles")
          .update({ xp: newXP, level: newLevel })
          .eq("id", user.id);
      }

      toast({
        title: "Success!",
        description: `Post created! You earned ${xpEarned} XP.`,
      });

      navigate("/community");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card className="p-6 md:p-8 bg-surface border-border/50">
        <h1 className="text-3xl font-bold mb-6">Share Your Knowledge</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics, Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={postType} onValueChange={(value: any) => setPostType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Study Material (50 XP)</SelectItem>
                  <SelectItem value="strategy">Study Strategy (30 XP)</SelectItem>
                  <SelectItem value="idea">Idea (20 XP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Share your knowledge, tips, or resources..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Posting..." : "Share Post"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CreatePost;
