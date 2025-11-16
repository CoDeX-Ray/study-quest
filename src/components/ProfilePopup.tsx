import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Award, ExternalLink, LogIn } from "lucide-react";
import XPBar from "@/components/XPBar";

interface Profile {
  id: string;
  xp: number;
  level: number;
  full_name: string;
  role: string;
  avatar_url: string | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_required: number;
}

interface ProfilePopupProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfilePopup = ({ userId, open, onOpenChange }: ProfilePopupProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Require authentication to view profiles
    if (open && !authLoading && !user) {
      onOpenChange(false);
      navigate("/auth");
      return;
    }

    if (open && userId && user) {
      fetchProfile();
      fetchAchievements();
    }
  }, [open, userId, user, authLoading, navigate, onOpenChange]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) setProfile(data);
    setLoading(false);
  };

  const fetchAchievements = async () => {
    if (!userId) return;

    const { data: allAchievements } = await supabase
      .from("achievements")
      .select("*")
      .order("xp_required");

    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    if (allAchievements) setAchievements(allAchievements);
    if (userAchievements) {
      setUnlockedAchievements(userAchievements.map(a => a.achievement_id));
    }
  };

  const handleViewFullProfile = () => {
    if (userId) {
      onOpenChange(false);
      navigate(`/profile/${userId}`);
    }
  };

  if (!userId) return null;

  // Show login prompt if not authenticated
  if (!authLoading && !user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Please sign in to view user profiles.
            </p>
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate("/auth");
              }}
              className="w-full bg-game-green hover:bg-game-green-dark"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        
        {authLoading || loading ? (
          <div className="flex items-center justify-center py-8">Loading...</div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card className="p-6 bg-gradient-card border-border/50">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-game-green/20 flex items-center justify-center text-3xl">
                  {profile.full_name?.[0] || "?"}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold mb-2">{profile.full_name}</h2>
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                    <Badge variant="secondary">{profile.role}</Badge>
                    <Badge variant="outline" className="border-level-gold/50 text-level-gold">
                      Level {profile.level}
                    </Badge>
                  </div>
                  <XPBar currentXP={profile.xp} maxXP={profile.level * 100} level={profile.level} />
                </div>
              </div>
            </Card>

            {/* Achievements Preview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Achievements
                </h3>
                <Badge variant="outline">
                  {unlockedAchievements.length} / {achievements.length} Unlocked
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {achievements.slice(0, 6).map((achievement) => {
                  const isUnlocked = unlockedAchievements.includes(achievement.id);
                  return (
                    <Card
                      key={achievement.id}
                      className={`p-4 ${isUnlocked ? "bg-gradient-card border-game-green" : "bg-surface opacity-60"}`}
                    >
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <h4 className="font-semibold text-sm mb-1">{achievement.name}</h4>
                      {isUnlocked && (
                        <Badge className="bg-game-green text-xs">Unlocked</Badge>
                      )}
                    </Card>
                  );
                })}
              </div>
              {achievements.length > 6 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  +{achievements.length - 6} more achievements
                </p>
              )}
            </div>

            {/* Level/Rank Info */}
            <Card className="p-4 bg-surface">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-level-gold" />
                <h3 className="font-semibold">Current Rank</h3>
              </div>
              <div className="space-y-2">
                {profile.level >= 1 && profile.level <= 5 && (
                  <Badge>Novice (Level 1-5)</Badge>
                )}
                {profile.level >= 6 && profile.level <= 10 && (
                  <Badge className="bg-blue-500">Apprentice (Level 6-10)</Badge>
                )}
                {profile.level >= 11 && profile.level <= 20 && (
                  <Badge className="bg-purple-500">Expert (Level 11-20)</Badge>
                )}
                {profile.level >= 21 && (
                  <Badge className="bg-game-green">Master (Level 21+)</Badge>
                )}
              </div>
            </Card>

            {/* View Full Profile Button */}
            <Button
              onClick={handleViewFullProfile}
              className="w-full bg-game-green hover:bg-game-green-dark"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Full Profile
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Profile not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePopup;

