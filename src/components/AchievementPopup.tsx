import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_required: number;
}

interface AchievementPopupProps {
  achievement: Achievement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AchievementPopup = ({ achievement, open, onOpenChange }: AchievementPopupProps) => {
  if (!achievement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Achievement Unlocked!</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <Card className="p-8 bg-gradient-card border-game-green border-2">
              <div className="text-6xl mb-4 text-center">{achievement.icon}</div>
              <h3 className="text-2xl font-bold text-center mb-2">{achievement.name}</h3>
              <p className="text-center text-muted-foreground mb-4">{achievement.description}</p>
              <div className="flex justify-center">
                <Badge className="bg-game-green">
                  <Trophy className="w-4 h-4 mr-1" />
                  Unlocked!
                </Badge>
              </div>
            </Card>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Congratulations! You've earned this achievement.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementPopup;

