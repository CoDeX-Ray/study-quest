import { Plus, Heart, MessageCircle, Share2, BookOpen, FileText, Video, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Community = () => {
  const posts = [
    {
      id: 1,
      author: "Alex Chen",
      avatar: "/placeholder.svg",
      level: 15,
      title: "Advanced Calculus Study Guide",
      content: "Just finished creating a comprehensive study guide for Calculus III. Covers all major topics with examples and practice problems.",
      type: "PDF",
      subject: "Mathematics",
      likes: 42,
      comments: 8,
      shares: 12,
      timeAgo: "2 hours ago",
      xpEarned: 75
    },
    {
      id: 2,
      author: "Sarah Kim",
      avatar: "/placeholder.svg",
      level: 12,
      title: "Physics Lab Report Template",
      content: "Created a standardized template for physics lab reports that follows proper scientific format. Great for organizing your experiments!",
      type: "Document",
      subject: "Physics",
      likes: 28,
      comments: 5,
      shares: 18,
      timeAgo: "4 hours ago",
      xpEarned: 50
    },
    {
      id: 3,
      author: "Mike Johnson",
      avatar: "/placeholder.svg",
      level: 18,
      title: "Chemistry Reaction Mechanisms Video",
      content: "Explaining complex organic chemistry reactions with step-by-step visual breakdowns. Perfect for visual learners!",
      type: "Video",
      subject: "Chemistry",
      likes: 67,
      comments: 15,
      shares: 23,
      timeAgo: "6 hours ago",
      xpEarned: 100
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PDF": return <FileText className="h-4 w-4" />;
      case "Video": return <Video className="h-4 w-4" />;
      case "Document": return <BookOpen className="h-4 w-4" />;
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold font-gaming">Community</h1>
            <p className="text-muted-foreground">Share knowledge and learn together</p>
          </div>
          <Button className="bg-game-green hover:bg-game-green-dark shadow-glow">
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
          {posts.map((post) => (
            <Card key={post.id} className="p-6 bg-gradient-card border-border/50 hover:border-game-green/30 transition-all duration-300">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-game-green/50">
                    <AvatarImage src={post.avatar} />
                    <AvatarFallback className="bg-surface-elevated">
                      {post.author.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{post.author}</span>
                      <Badge variant="outline" className="text-xs border-level-gold/50 text-level-gold">
                        Level {post.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{post.timeAgo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getSubjectColor(post.subject)}>
                    {post.subject}
                  </Badge>
                  <Badge variant="outline" className="border-game-green/50 text-game-green">
                    +{post.xpEarned} XP
                  </Badge>
                </div>
              </div>

              {/* Post Content */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  {getTypeIcon(post.type)}
                  <h3 className="text-lg font-semibold">{post.title}</h3>
                </div>
                <p className="text-muted-foreground">{post.content}</p>
              </div>

              {/* Post Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex items-center gap-6">
                  <button className="flex items-center gap-2 text-muted-foreground hover:text-game-green transition-colors">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-muted-foreground hover:text-game-green transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-2 text-muted-foreground hover:text-game-green transition-colors">
                    <Share2 className="h-4 w-4" />
                    <span className="text-sm">{post.shares}</span>
                  </button>
                </div>
                <Button variant="outline" size="sm" className="border-game-green/50 hover:bg-game-green/10">
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline" className="border-game-green/50 hover:bg-game-green/10">
            Load More Posts
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Community;