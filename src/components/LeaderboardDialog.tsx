import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, Medal, Award, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  role: string;
  current_streak: number | null;
}

export const LeaderboardDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<LeaderboardUser[]>([]);
  const [students, setStudents] = useState<LeaderboardUser[]>([]);
  const [professionals, setProfessionals] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (open) {
      fetchLeaderboard();
    }
  }, [open, activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, xp, level, role, current_streak")
        .order("xp", { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setAllUsers(data);
        setStudents(data.filter((u) => u.role === "student"));
        setProfessionals(data.filter((u) => u.role === "professional"));
      }
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-5">{index + 1}</span>;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return "bg-yellow-500/10 border-yellow-500/50";
    if (index === 1) return "bg-gray-400/10 border-gray-400/50";
    if (index === 2) return "bg-amber-600/10 border-amber-600/50";
    return "bg-card border-border";
  };

  const renderLeaderboard = (users: LeaderboardUser[]) => {
    if (loading) {
      return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
    }

    if (users.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No users found</div>;
    }

    return (
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {users.map((userProfile, index) => (
          <div
            key={userProfile.id}
            className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
              user?.id === userProfile.id
                ? "bg-game-green/10 border-game-green/50"
                : getRankColor(index)
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">{getRankIcon(index)}</div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={userProfile.avatar_url || undefined} />
                <AvatarFallback>
                  {userProfile.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">
                    {userProfile.full_name || "Anonymous"}
                  </p>
                  {user?.id === userProfile.id && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {userProfile.role}
                  </Badge>
                  <span>Level {userProfile.level}</span>
                  {userProfile.current_streak && userProfile.current_streak > 0 && (
                    <span className="flex items-center gap-1">
                      🔥 {userProfile.current_streak}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-game-green">{userProfile.xp.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="hidden"
        id="leaderboard-trigger"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard
            </DialogTitle>
            <DialogDescription>
              See how you rank against other learners
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="professionals">Professionals</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              {renderLeaderboard(allUsers)}
            </TabsContent>
            <TabsContent value="students" className="mt-4">
              {renderLeaderboard(students)}
            </TabsContent>
            <TabsContent value="professionals" className="mt-4">
              {renderLeaderboard(professionals)}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
