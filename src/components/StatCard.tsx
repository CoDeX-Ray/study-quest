import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  className?: string;
  trend?: "up" | "down" | "neutral";
}

const StatCard = ({ title, value, icon, className = "", trend = "neutral" }: StatCardProps) => {
  const trendColors = {
    up: "text-game-green",
    down: "text-destructive",
    neutral: "text-muted-foreground"
  };

  return (
    <Card className={`p-6 bg-gradient-card border-border/50 hover:border-game-green/50 transition-all duration-300 hover:shadow-glow ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${trendColors[trend]}`}>{value}</p>
        </div>
        <div className="p-3 bg-surface-elevated rounded-lg text-game-green">
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;