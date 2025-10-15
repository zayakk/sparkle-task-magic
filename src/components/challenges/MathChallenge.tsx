import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Clock, X } from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  time_limit: number;
  points_reward: number;
}

interface MathChallengeProps {
  challenge: Challenge;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

export const MathChallenge = ({ challenge, onComplete, onCancel }: MathChallengeProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState("");
  const [questions, setQuestions] = useState<Array<{ q: string; a: number }>>([]);
  const [timeLeft, setTimeLeft] = useState(challenge.time_limit);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const newQuestions = Array.from({ length: 10 }, () => {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      const ops = ['+', '-', '×'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let result = 0;
      if (op === '+') result = a + b;
      else if (op === '-') result = a - b;
      else result = a * b;
      return { q: `${a} ${op} ${b}`, a: result };
    });
    setQuestions(newQuestions);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      finish();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const finish = () => {
    setIsFinished(true);
    setTimeout(() => onComplete(score), 1500);
  };

  const checkAnswer = () => {
    if (parseInt(answer) === questions[currentQuestion].a) {
      setScore(score + 10);
    }
    
    if (currentQuestion + 1 >= questions.length) {
      finish();
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setAnswer("");
    }
  };

  if (questions.length === 0) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold">{challenge.title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="text-lg">
            Асуулт <span className="font-bold">{currentQuestion + 1}</span> / {questions.length}
          </div>
          <div className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            <span className={timeLeft < 30 ? "text-red-500 font-bold" : ""}>{timeLeft}с</span>
          </div>
          <div className="text-lg">
            Оноо: <span className="font-bold text-primary">{score}</span>
          </div>
        </div>

        {!isFinished ? (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-primary mb-8">
                {questions[currentQuestion].q} = ?
              </div>
              <Input
                type="number"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                placeholder="Хариултаа оруулна уу"
                className="text-2xl text-center h-16"
                autoFocus
              />
            </div>
            <Button onClick={checkAnswer} className="w-full h-12 text-lg">
              Дараагийнх
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
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
