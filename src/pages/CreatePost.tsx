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
import { ArrowLeft, Upload, X } from "lucide-react";

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("College");
  const [department, setDepartment] = useState("");
  const [postType, setPostType] = useState<"material" | "strategy" | "idea">("material");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

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
      let fileUrl = null;

      // Upload file if present
      if (file) {
        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-files')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
        setUploading(false);
      }

      // Insert post
      const { error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title,
          content,
          subject: subject || null,
          category,
          department: department || null,
          post_type: postType,
          file_url: fileUrl,
        });

      if (postError) throw postError;

      // Log activity: user posted content
      await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          action: "Posted content in Community",
          details: {
            post_title: title,
            post_type: postType,
            category: category,
            subject: subject || null,
            content_preview: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
          },
        });

      // Update user XP and recalculate level
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp, level")
        .eq("id", user.id)
        .single();

      if (profile) {
        const newXP = profile.xp + xpEarned;
        // Level calculation: Level 1 = 0-99 XP, Level 2 = 100-199 XP, etc.
        const newLevel = Math.floor(newXP / 100) + 1;

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ xp: newXP, level: newLevel })
          .eq("id", user.id);

        if (updateError) throw updateError;
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
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="College of Engineering">College of Engineering</SelectItem>
                  <SelectItem value="College of Education">College of Education</SelectItem>
                  <SelectItem value="College of Arts and Science">College of Arts and Science</SelectItem>
                  <SelectItem value="College of Industrial Technology">College of Industrial Technology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics, Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="file">Attach File (Optional)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                className="hidden"
              />
              <Label
                htmlFor="file"
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors"
              >
                <Upload className="w-4 h-4" />
                {file ? "Change File" : "Upload File"}
              </Label>
              {file && (
                <div className="flex items-center gap-2 flex-1 px-4 py-2 bg-surface border border-border rounded-md">
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Supported: Images, PDF, Word, PowerPoint, Excel, Text (Max 10MB)
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || uploading}>
            {loading ? "Posting..." : uploading ? "Uploading..." : "Share Post"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CreatePost;
