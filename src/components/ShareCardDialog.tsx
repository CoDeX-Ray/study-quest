import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, UserPlus, Check } from "lucide-react";

interface Friend {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  role: string;
}

interface ShareCardDialogProps {
  children: React.ReactNode;
  cardId: string;
  cardTitle: string;
}

export const ShareCardDialog = ({ children, cardId, cardTitle }: ShareCardDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFriends();
      fetchSharedWith();
    }
  }, [open]);

  const fetchFriends = async () => {
    if (!user) return;

    try {
      // Get accepted friends
      const { data: friendData, error } = await supabase
        .from("friends")
        .select(`
          friend_id,
          user_id,
          profiles:friend_id (
            id,
            full_name,
            avatar_url,
            email,
            role
          )
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (error) throw error;

      const friendList: Friend[] = [];
      if (friendData) {
        friendData.forEach((f) => {
          const friendId = f.friend_id === user.id ? f.user_id : f.friend_id;
          if (f.profiles && !Array.isArray(f.profiles)) {
            friendList.push({
              id: friendId,
              ...(f.profiles as any),
            });
          }
        });
      }

      setFriends(friendList);
    } catch (error: any) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchSharedWith = async () => {
    try {
      const { data, error } = await supabase
        .from("shared_cards")
        .select("shared_with_user_id")
        .eq("card_id", cardId);

      if (error) throw error;

      if (data) {
        setSharedWith(new Set(data.map((d) => d.shared_with_user_id)));
      }
    } catch (error: any) {
      console.error("Error fetching shared with:", error);
    }
  };

  const handleShare = async (friendId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("shared_cards").insert({
        card_id: cardId,
        shared_by_user_id: user.id,
        shared_with_user_id: friendId,
      });

      if (error) throw error;

      setSharedWith((prev) => new Set([...prev, friendId]));
      toast.success("Card shared successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to share card");
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter((friend) =>
    friend.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share "{cardTitle}"</DialogTitle>
          <DialogDescription>
            Share this study card deck with your friends
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {friends.length === 0 ? (
                  <div className="space-y-2">
                    <p>No friends yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        // Navigate to friends page or open friend request dialog
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Friends
                    </Button>
                  </div>
                ) : (
                  <p>No friends match your search.</p>
                )}
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback>
                        {friend.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{friend.full_name || "Anonymous"}</p>
                      <p className="text-sm text-muted-foreground">{friend.email}</p>
                    </div>
                  </div>
                  {sharedWith.has(friend.id) ? (
                    <Badge variant="outline" className="gap-1">
                      <Check className="h-3 w-3" />
                      Shared
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleShare(friend.id)}
                      disabled={loading}
                    >
                      Share
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
