import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, UserPlus, Check, X } from "lucide-react";

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
    role: string;
  };
}

export const FriendRequestDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Allow external trigger
  useEffect(() => {
    const handleTrigger = () => setOpen(true);
    const trigger = document.getElementById("friend-request-trigger");
    if (trigger) {
      trigger.addEventListener("click", handleTrigger);
      return () => trigger.removeEventListener("click", handleTrigger);
    }
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPendingRequests();
    }
  }, [open]);

  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("friends")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            email,
            role
          )
        `)
        .eq("friend_id", user.id)
        .eq("status", "pending");

      if (error) throw error;

      setPendingRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const searchUsers = async () => {
    if (!user || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email, role")
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .neq("id", user.id)
        .limit(10);

      if (error) throw error;

      // Filter out users who are already friends or have pending requests
      const { data: existingFriends } = await supabase
        .from("friends")
        .select("user_id, friend_id, status")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = new Set(
        existingFriends?.flatMap((f) => [
          f.user_id === user.id ? f.friend_id : f.user_id,
        ]) || []
      );

      setSearchResults(
        (data || []).filter((profile) => !friendIds.has(profile.id))
      );
    } catch (error: any) {
      toast.error("Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("friends").insert({
        user_id: user.id,
        friend_id: friendId,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Friend request sent!");
      setSearchQuery("");
      setSearchResults([]);
    } catch (error: any) {
      toast.error(error.message || "Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async (requestId: string, accept: boolean) => {
    setLoading(true);
    try {
      if (accept) {
        const { error } = await supabase
          .from("friends")
          .update({ status: "accepted" })
          .eq("id", requestId);

        if (error) throw error;
        toast.success("Friend request accepted!");
      } else {
        const { error } = await supabase
          .from("friends")
          .delete()
          .eq("id", requestId);

        if (error) throw error;
        toast.success("Friend request declined");
      }

      fetchPendingRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to update friend request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="hidden"
        id="friend-request-trigger"
      />
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
          <DialogDescription>
            Send friend requests and manage your connections
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search Users */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers();
                }}
                className="pl-10"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="border rounded-lg p-2 space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-2 hover:bg-accent rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {profile.full_name || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendFriendRequest(profile.id)}
                      disabled={loading}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Pending Requests</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={request.profiles?.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {request.profiles?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {request.profiles?.full_name || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          wants to be your friend
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFriendRequest(request.id, false)}
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleFriendRequest(request.id, true)}
                        disabled={loading}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
