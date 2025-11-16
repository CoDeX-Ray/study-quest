import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Zap } from "lucide-react";

interface LevelUpPopupProps {
  newLevel: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LevelUpPopup = ({ newLevel, open, onOpenChange }: LevelUpPopupProps) => {
  const getRankName = (level: number) => {
    if (level >= 1 && level <= 5) return "Novice";
    if (level >= 6 && level <= 10) return "Apprentice";
    if (level >= 11 && level <= 20) return "Expert";
    if (level >= 21) return "Master";
    return "Novice";
  };

  const getRankColor = (level: number) => {
    if (level >= 1 && level <= 5) return "bg-gray-500";
    if (level >= 6 && level <= 10) return "bg-blue-500";
    if (level >= 11 && level <= 20) return "bg-purple-500";
    if (level >= 21) return "bg-game-green";
    return "bg-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Level Up!</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <Card className="p-8 bg-gradient-card border-level-gold border-2">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Zap className="h-16 w-16 text-level-gold animate-pulse" fill="currentColor" />
                  <div className="absolute inset-0 h-16 w-16 text-level-gold opacity-50 animate-ping">
                    <Zap className="h-16 w-16" fill="currentColor" />
                  </div>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-center mb-2">Level {newLevel}</h3>
              <div className="flex justify-center mb-4">
                <Badge className={`${getRankColor(newLevel)} text-white`}>
                  <Award className="w-4 h-4 mr-1" />
                  {getRankName(newLevel)}
                </Badge>
              </div>
              <p className="text-center text-muted-foreground">
                Congratulations! You've reached a new level!
              </p>
            </Card>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Keep learning and sharing to level up even more!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LevelUpPopup;

