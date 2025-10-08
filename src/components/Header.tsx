import { Sparkles } from "lucide-react";

interface HeaderProps {
  points: number;
  level: number;
}

export const Header = ({ points, level }: HeaderProps) => {
  const pointsToNextLevel = (level + 1) * 100;
  const progress = (points % 100) / 100 * 100;

  return (
    <header className="w-full bg-gradient-magic rounded-3xl p-6 mb-8 shadow-glow-primary animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-white animate-sparkle" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Cute Task Quest
          </h1>
        </div>
        <div className="text-right">
          <div className="text-white/90 text-sm font-semibold">Level {level}</div>
          <div className="text-white font-bold text-xl">{points} pts</div>
        </div>
      </div>
      <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-white h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-white/80 text-xs mt-1 text-right">
        {100 - (points % 100)} pts to level {level + 1}
      </div>
    </header>
  );
};
