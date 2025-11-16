import { supabase } from "@/integrations/supabase/client";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_required: number;
}

/**
 * Check and unlock achievements based on user's current XP and post count
 * Returns array of newly unlocked achievement IDs
 */
export const checkAndUnlockAchievements = async (
  userId: string,
  currentXP: number,
  postCount?: number
): Promise<string[]> => {
  const newlyUnlocked: string[] = [];

  try {
    // Get all achievements
    const { data: allAchievements } = await supabase
      .from("achievements")
      .select("*")
      .order("xp_required");

    if (!allAchievements) return newlyUnlocked;

    // Get user's already unlocked achievements
    const { data: userAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    const unlockedIds = new Set(
      userAchievements?.map((a) => a.achievement_id) || []
    );

    // Check each achievement
    for (const achievement of allAchievements) {
      // Skip if already unlocked
      if (unlockedIds.has(achievement.id)) continue;

      let shouldUnlock = false;

      // Check XP-based achievements
      if (achievement.xp_required > 0) {
        if (currentXP >= achievement.xp_required) {
          shouldUnlock = true;
        }
      } else {
        // Check post-based achievements (xp_required = 0 means it's post-based)
        if (postCount !== undefined) {
          if (achievement.name === "First Share" && postCount >= 1) {
            shouldUnlock = true;
          } else if (achievement.name === "Community Helper" && postCount >= 10) {
            shouldUnlock = true;
          }
        }
      }

      if (shouldUnlock) {
        // Unlock the achievement
        const { error } = await supabase
          .from("user_achievements")
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
          });

        if (!error) {
          newlyUnlocked.push(achievement.id);
        }
      }
    }
  } catch (error) {
    console.error("Error checking achievements:", error);
  }

  return newlyUnlocked;
};

/**
 * Get achievement details by ID
 */
export const getAchievementById = async (
  achievementId: string
): Promise<Achievement | null> => {
  const { data } = await supabase
    .from("achievements")
    .select("*")
    .eq("id", achievementId)
    .single();

  return data || null;
};

