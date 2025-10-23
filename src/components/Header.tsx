import { Sparkles, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

interface HeaderProps {
  points: number;
  level: number;
}

export const Header = ({ points, level }: HeaderProps) => {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const preferDark = saved ? saved === "dark" : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (preferDark) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const pointsToNextLevel = (level + 1) * 100;
  const progress = (points % 100) / 100 * 100;

  return (
    <header className="w-full bg-gradient-magic rounded-3xl p-6 mb-8 shadow-glow-primary animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-white animate-sparkle" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">
             Task Quest
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button size="icon" variant="secondary" onClick={toggleTheme} className="rounded-full">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <div className="text-right">
            <div className="text-white/90 text-sm font-semibold">Level {level}</div>
            <div className="text-white font-bold text-xl">{points} оноо</div>
          </div>
        </div>
      </div>
      <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-white h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* <div className="text-white/80 text-xs mt-1 text-right">
        {100 - (points % 100)} pts to level {level + 1}
      </div> */}
    </header>
  );
};
