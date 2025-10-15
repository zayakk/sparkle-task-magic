import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Zap, Brain, Target } from "lucide-react";
import confetti from "canvas-confetti";
import { MathChallenge } from "@/components/challenges/MathChallenge";
import { MemoryChallenge } from "@/components/challenges/MemoryChallenge";
import { SpeedChallenge } from "@/components/challenges/SpeedChallenge";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  points_reward: number;
  time_limit: number;
}

const Challenges = () => {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    loadChallenges();
    loadUserPoints();
  }, []);

  const loadChallenges = async () => {
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .eq("is_active", true);
    if (data) setChallenges(data);
  };

  const loadUserPoints = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_stats")
      .select("points")
      .eq("user_id", user.id)
      .single();
    if (data) setUserPoints(data.points);
  };

  const celebrateWin = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#9b87f5', '#FFB6D9', '#E5DEFF', '#FDE1D3']
    });
  };

  const handleChallengeComplete = async (challengeId: string, score: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return;

    await supabase.from("user_challenges").upsert({
      user_id: user.id,
      challenge_id: challengeId,
      completed: true,
      completed_at: new Date().toISOString(),
      score: score,
    });

    const newPoints = userPoints + challenge.points_reward;
    await supabase
      .from("user_stats")
      .update({ points: newPoints })
      .eq("user_id", user.id);

    setUserPoints(newPoints);
    celebrateWin();
    
    toast({
      title: "🎉 Баяр хүргэе!",
      description: `Та ${challenge.points_reward} оноо авлаа!`,
    });
    
    setActiveChallenge(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "hard": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "Амархан";
      case "medium": return "Дунд";
      case "hard": return "Хүнд";
      default: return difficulty;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "math": return <Brain className="w-5 h-5" />;
      case "memory": return <Target className="w-5 h-5" />;
      case "speed": return <Zap className="w-5 h-5" />;
      default: return <Trophy className="w-5 h-5" />;
    }
  };

  if (activeChallenge) {
    if (activeChallenge.type === "math") {
      return (
        <MathChallenge
          challenge={activeChallenge}
          onComplete={(score) => handleChallengeComplete(activeChallenge.id, score)}
          onCancel={() => setActiveChallenge(null)}
        />
      );
    } else if (activeChallenge.type === "memory") {
      return (
        <MemoryChallenge
          challenge={activeChallenge}
          onComplete={(score) => handleChallengeComplete(activeChallenge.id, score)}
          onCancel={() => setActiveChallenge(null)}
        />
      );
    } else if (activeChallenge.type === "speed") {
      return (
        <SpeedChallenge
          challenge={activeChallenge}
          onComplete={(score) => handleChallengeComplete(activeChallenge.id, score)}
          onCancel={() => setActiveChallenge(null)}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-magic rounded-3xl p-6 mb-8 shadow-glow-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-white animate-float" />
              <h1 className="text-3xl font-bold text-white">Сорилтууд</h1>
            </div>
            <div className="text-right">
              <p className="text-white/90 text-sm">Нийт оноо</p>
              <p className="text-white font-bold text-2xl">{userPoints}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((challenge, index) => (
            <Card
              key={challenge.id}
              className="p-6 hover:shadow-glow-primary transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  {getTypeIcon(challenge.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">{challenge.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {challenge.description}
                  </p>
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(challenge.difficulty)}`}>
                      {getDifficultyText(challenge.difficulty)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(challenge.time_limit / 60)} мин
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {challenge.points_reward} оноо
                    </span>
                  </div>
                  <Button
                    onClick={() => setActiveChallenge(challenge)}
                    className="w-full"
                  >
                    Эхлүүлэх
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Challenges;
