import { Zap } from "lucide-react";

const StudyQuestLogo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Zap className="h-8 w-8 text-game-green animate-glow" fill="currentColor" />
        <div className="absolute inset-0 h-8 w-8 text-game-green animate-pulse opacity-50">
          <Zap className="h-8 w-8" fill="currentColor" />
        </div>
      </div>
      <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
        StudyQuest
      </span>
    </div>
  );
};

export default StudyQuestLogo;