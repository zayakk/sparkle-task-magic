import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Clock, X } from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  time_limit: number;
}

interface SpeedChallengeProps {
  challenge: Challenge;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const COLORS = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500"];
const COLOR_NAMES = ["Улаан", "Цэнхэр", "Ногоон", "Шар"];

export const SpeedChallenge = ({ challenge, onComplete, onCancel }: SpeedChallengeProps) => {
  const [score, setScore] = useState(0);
  const [currentColor, setCurrentColor] = useState(0);
  const [timeLeft, setTimeLeft] = useState(challenge.time_limit);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsFinished(true);
      setTimeout(() => onComplete(score), 1500);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, score]);

  const handleClick = (index: number) => {
    if (index === currentColor) {
      setScore(score + 10);
      setCurrentColor(Math.floor(Math.random() * 4));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold">{challenge.title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className={timeLeft < 30 ? "text-red-500 font-bold" : "text-xl"}>{timeLeft}с</span>
          </div>
          <div className="text-xl">
            Оноо: <span className="font-bold text-primary">{score}</span>
          </div>
        </div>

        {!isFinished ? (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl font-bold mb-6">
                {COLOR_NAMES[currentColor]} өнгийг дарна уу!
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {COLORS.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleClick(index)}
                  className={`${color} h-32 rounded-xl hover:opacity-80 transition-all duration-200 transform hover:scale-105 active:scale-95`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚡</div>
            <h3 className="text-3xl font-bold mb-2">Дууслаа!</h3>
            <p className="text-xl text-muted-foreground">
              Нийт оноо: <span className="font-bold text-primary">{score}</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
