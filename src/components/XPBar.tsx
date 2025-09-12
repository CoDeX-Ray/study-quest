interface XPBarProps {
  currentXP: number;
  maxXP: number;
  level: number;
  className?: string;
}

const XPBar = ({ currentXP, maxXP, level, className = "" }: XPBarProps) => {
  const percentage = (currentXP / maxXP) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Level {level}</span>
        <span className="text-sm font-medium text-muted-foreground">
          {currentXP}/{maxXP} XP
        </span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-primary transition-all duration-500 ease-out shadow-glow"
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      </div>
    </div>
  );
};

export default XPBar;