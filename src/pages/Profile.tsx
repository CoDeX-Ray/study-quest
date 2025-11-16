import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ShoppingBag, Award, Info } from "lucide-react";
import XPBar from "@/components/XPBar";
import { checkAndUnlockAchievements, getAchievementById } from "@/utils/achievements";
import AchievementPopup from "@/components/AchievementPopup";
import LevelUpPopup from "@/components/LevelUpPopup";

interface Profile {
  id: string;
  xp: number;
  level: number;
  border_style: string;
  name_color: string;
  full_name: string;
  role: string;
  email?: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_required: number;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  item_type: string;
  item_value: string;
  xp_cost: number;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [achievementPopup, setAchievementPopup] = useState<{ id: string; name: string; description: string; icon: string; xp_required: number } | null>(null);
  const [levelUpPopup, setLevelUpPopup] = useState<{ level: number } | null>(null);
  const [activeTab, setActiveTab] = useState("achievements");

  // Determine which user's profile to show
  const targetUserId = userId || user?.id;
  const isViewingOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    // Require authentication to view any profile
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && targetUserId) {
      fetchProfile();
      fetchAchievements();
      if (isViewingOwnProfile) {
        fetchShopItems();
      }
    }
  }, [user, targetUserId, isViewingOwnProfile]);

  const fetchProfile = async () => {
    if (!targetUserId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      navigate("/profile");
      return;
    }
    
    if (data) setProfile(data);
    setLoading(false);
  };

  const fetchAchievements = async () => {
    if (!targetUserId) return;

    const { data: allAchievements } = await supabase
      .from("achievements")
      .select("*")
      .order("xp_required");

    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", targetUserId);

    if (allAchievements) setAchievements(allAchievements);
    if (userAchievements) {
      setUnlockedAchievements(userAchievements.map(a => a.achievement_id));
    }
  };

  const fetchShopItems = async () => {
    if (!user?.id) return;

    const { data: items } = await supabase
      .from("shop_items")
      .select("*")
      .order("xp_cost");

    const { data: userPurchases } = await supabase
      .from("user_purchases")
      .select("shop_item_id")
      .eq("user_id", user.id);

    if (items) setShopItems(items);
    if (userPurchases) {
      setPurchases(userPurchases.map(p => p.shop_item_id));
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!profile || !user) return;

    // Check if already purchased FIRST - if owned, just equip it (no XP check needed)
    if (purchases.includes(item.id)) {
      // Equip the item
      const updateData: { border_style?: string; name_color?: string } = {};
      if (item.item_type === "border") {
        updateData.border_style = item.item_value;
      } else if (item.item_type === "name_color") {
        updateData.name_color = item.item_value;
      }

      const { error: equipError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (equipError) {
        toast({
          title: "Error",
          description: "Failed to equip item",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Item Equipped!",
        description: `${item.name} has been equipped.`,
      });

      fetchProfile();
      return;
    }

    // Purchase new item - check XP only for new purchases
    if (profile.xp < item.xp_cost) {
      toast({
        title: "Not enough XP",
        description: `You need ${item.xp_cost} XP to purchase this item. Your XP will be reduced by ${item.xp_cost} when you purchase.`,
        variant: "destructive",
      });
      return;
    }

    // Purchase new item
    const { error } = await supabase
      .from("user_purchases")
      .insert({ user_id: user.id, shop_item_id: item.id });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to purchase item",
        variant: "destructive",
      });
      return;
    }

    // Deduct XP and apply item
    const oldLevel = profile.level;
    const newXP = profile.xp - item.xp_cost;
    const newLevel = Math.floor(newXP / 100) + 1;

    const updateData: { xp: number; level: number; border_style?: string; name_color?: string } = {
      xp: newXP,
      level: newLevel,
    };

    if (item.item_type === "border") {
      updateData.border_style = item.item_value;
    } else if (item.item_type === "name_color") {
      updateData.name_color = item.item_value;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return;
    }

    // Check for level down (if level decreased)
    if (newLevel < oldLevel) {
      // Log level down for admin
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "Level Down (XP Spent)",
        details: {
          old_level: oldLevel,
          new_level: newLevel,
          xp_spent: item.xp_cost,
          total_xp: newXP,
        },
      });
    }

    // Log activity for admin
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "Purchased item from Shop",
      details: {
        item_name: item.name,
        item_type: item.item_type,
        item_value: item.item_value,
        xp_cost: item.xp_cost,
        xp_remaining: newXP,
      },
    });

    // Get post count for achievement checking
    const { count: postCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Check achievements (though XP decreased, some achievements might still be valid)
    const newlyUnlocked = await checkAndUnlockAchievements(
      user.id,
      newXP,
      postCount || 0
    );

    if (newlyUnlocked.length > 0) {
      const firstAchievement = await getAchievementById(newlyUnlocked[0]);
      if (firstAchievement) {
        setAchievementPopup(firstAchievement);
      }
    }

    toast({
      title: "Purchase successful!",
      description: `You bought and equipped ${item.name}. ${item.xp_cost} XP has been deducted from your account.`,
    });

    fetchProfile();
    fetchShopItems();
  };

  const handleUnequip = async (item: ShopItem) => {
    if (!user || !purchases.includes(item.id)) return;

    const updateData: { border_style?: string; name_color?: string } = {};
    if (item.item_type === "border") {
      updateData.border_style = "default";
    } else if (item.item_type === "name_color") {
      updateData.name_color = "default";
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unequip item",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item Unequipped",
      description: `${item.name} has been unequipped.`,
    });

    fetchProfile();
  };

  if (authLoading || loading || !profile) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <AchievementPopup
        achievement={achievementPopup}
        open={!!achievementPopup}
        onOpenChange={(open) => !open && setAchievementPopup(null)}
      />
      <LevelUpPopup
        newLevel={levelUpPopup?.level || 0}
        open={!!levelUpPopup}
        onOpenChange={(open) => !open && setLevelUpPopup(null)}
      />
      
      <Card className="p-6 md:p-8 mb-8 bg-gradient-card border-border/50">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-game-green/20 flex items-center justify-center text-4xl">
            {profile.full_name?.[0] || "?"}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full mb-8 ${isViewingOwnProfile ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <TabsTrigger value="achievements"><Trophy className="w-4 h-4 mr-2" />Achievements</TabsTrigger>
          {isViewingOwnProfile && (
            <TabsTrigger value="shop"><ShoppingBag className="w-4 h-4 mr-2" />Shop</TabsTrigger>
          )}
          <TabsTrigger value="ranks"><Award className="w-4 h-4 mr-2" />Ranks</TabsTrigger>
          {isViewingOwnProfile && (
            <TabsTrigger value="instructions"><Info className="w-4 h-4 mr-2" />How It Works</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="achievements">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => {
              const isUnlocked = unlockedAchievements.includes(achievement.id);
              return (
                <Card
                  key={achievement.id}
                  className={`p-6 ${isUnlocked ? "bg-gradient-card border-game-green" : "bg-surface opacity-60"}`}
                >
                  <div className="text-4xl mb-3">{achievement.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{achievement.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                  {isUnlocked ? (
                    <Badge className="bg-game-green">Unlocked</Badge>
                  ) : (
                    <Badge variant="outline">{achievement.xp_required} XP Required</Badge>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {isViewingOwnProfile && (
          <TabsContent value="shop">
            <Card className="p-4 mb-6 bg-warning/10 border-warning/20">
              <h3 className="font-semibold mb-2">💡 How Shop Works</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>When you purchase an item, <strong>XP will be deducted</strong> from your account (amount shown on each item)</li>
                <li>Purchased items are automatically equipped</li>
                <li>You can equip/unequip owned items anytime</li>
                <li>Your level may decrease if XP deduction causes you to drop below the current level threshold</li>
              </ul>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopItems.map((item) => {
                const isPurchased = purchases.includes(item.id);
                const canAfford = profile.xp >= item.xp_cost;
                const isEquipped = 
                  (item.item_type === "border" && profile.border_style === item.item_value) ||
                  (item.item_type === "name_color" && profile.name_color === item.item_value);

                return (
                  <Card key={item.id} className="p-6 bg-surface border-border/50">
                    <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{item.xp_cost} XP</Badge>
                        {isEquipped && (
                          <Badge className="bg-level-gold">Equipped</Badge>
                        )}
                        {isPurchased && !isEquipped && (
                          <Badge className="bg-game-green">Owned</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!isPurchased ? (
                          <Button
                            size="sm"
                            onClick={() => handlePurchase(item)}
                            disabled={!canAfford}
                            className="flex-1"
                          >
                            Buy & Equip
                          </Button>
                        ) : (
                          <>
                            {!isEquipped ? (
                              <Button
                                size="sm"
                                onClick={() => handlePurchase(item)}
                                className="flex-1 bg-game-green hover:bg-game-green-dark"
                              >
                                Equip
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnequip(item)}
                                className="flex-1"
                              >
                                Unequip
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        )}

        <TabsContent value="ranks">
          <Card className="p-6 bg-surface">
            <h2 className="text-2xl font-bold mb-6">Level Rankings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                <span className="font-semibold">Level 1-5</span>
                <Badge>Novice</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                <span className="font-semibold">Level 6-10</span>
                <Badge className="bg-blue-500">Apprentice</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                <span className="font-semibold">Level 11-20</span>
                <Badge className="bg-purple-500">Expert</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                <span className="font-semibold">Level 21+</span>
                <Badge className="bg-game-green">Master</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        {isViewingOwnProfile && (
          <TabsContent value="instructions">
            <Card className="p-6 md:p-8 bg-surface">
              <h2 className="text-2xl font-bold mb-6">How to Earn Points & Level Up</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-game-green">📚 Share Study Materials</h3>
                  <p className="text-muted-foreground">Upload and share your study notes, guides, or resources with the community. Earn <strong>50 XP</strong> per material shared.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-game-green">💡 Share Study Strategies</h3>
                  <p className="text-muted-foreground">Post effective study techniques and strategies that help others learn better. Earn <strong>30 XP</strong> per strategy shared.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-game-green">🎯 Share Ideas</h3>
                  <p className="text-muted-foreground">Contribute creative learning ideas and tips. Earn <strong>20 XP</strong> per idea shared.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-game-green">🏆 Unlock Achievements</h3>
                  <p className="text-muted-foreground">Complete milestones to unlock special achievements. Each achievement adds to your profile showcase!</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-game-green">🛍️ Shop Customizations</h3>
                  <p className="text-muted-foreground">Use your earned XP to purchase exclusive profile borders and name colors from the shop.</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Profile;
