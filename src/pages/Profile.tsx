import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ShoppingBag, Award, Info } from "lucide-react";
import XPBar from "@/components/XPBar";

interface Profile {
  xp: number;
  level: number;
  border_style: string;
  name_color: string;
  full_name: string;
  role: string;
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAchievements();
      fetchShopItems();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();
    
    if (data) setProfile(data);
  };

  const fetchAchievements = async () => {
    const { data: allAchievements } = await supabase
      .from("achievements")
      .select("*")
      .order("xp_required");

    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user?.id);

    if (allAchievements) setAchievements(allAchievements);
    if (userAchievements) {
      setUnlockedAchievements(userAchievements.map(a => a.achievement_id));
    }
  };

  const fetchShopItems = async () => {
    const { data: items } = await supabase
      .from("shop_items")
      .select("*")
      .order("xp_cost");

    const { data: userPurchases } = await supabase
      .from("user_purchases")
      .select("shop_item_id")
      .eq("user_id", user?.id);

    if (items) setShopItems(items);
    if (userPurchases) {
      setPurchases(userPurchases.map(p => p.shop_item_id));
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!profile || profile.xp < item.xp_cost) {
      toast({
        title: "Not enough XP",
        description: `You need ${item.xp_cost} XP to purchase this item.`,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("user_purchases")
      .insert({ user_id: user?.id, shop_item_id: item.id });

    if (!error) {
      await supabase
        .from("profiles")
        .update({ xp: profile.xp - item.xp_cost })
        .eq("id", user?.id);

      toast({
        title: "Purchase successful!",
        description: `You bought ${item.name}`,
      });

      fetchProfile();
      fetchShopItems();
    }
  };

  if (loading || !profile) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <Card className="p-6 md:p-8 mb-8 bg-gradient-card border-border/50">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-game-green/20 flex items-center justify-center text-4xl">
            {profile.full_name?.[0] || "?"}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
            <Badge variant="secondary" className="mb-4">{profile.role}</Badge>
            <XPBar currentXP={profile.xp} maxXP={profile.level * 100} level={profile.level} />
          </div>
        </div>
      </Card>

      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="achievements"><Trophy className="w-4 h-4 mr-2" />Achievements</TabsTrigger>
          <TabsTrigger value="shop"><ShoppingBag className="w-4 h-4 mr-2" />Shop</TabsTrigger>
          <TabsTrigger value="ranks"><Award className="w-4 h-4 mr-2" />Ranks</TabsTrigger>
          <TabsTrigger value="instructions"><Info className="w-4 h-4 mr-2" />How It Works</TabsTrigger>
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

        <TabsContent value="shop">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shopItems.map((item) => {
              const isPurchased = purchases.includes(item.id);
              const canAfford = profile.xp >= item.xp_cost;

              return (
                <Card key={item.id} className="p-6 bg-surface border-border/50">
                  <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{item.xp_cost} XP</Badge>
                    {isPurchased ? (
                      <Badge className="bg-game-green">Owned</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford}
                      >
                        Buy
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

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
      </Tabs>
    </div>
  );
};

export default Profile;
