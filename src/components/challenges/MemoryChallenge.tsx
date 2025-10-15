import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Clock, X } from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  time_limit: number;
}

interface MemoryChallengeProps {
  challenge: Challenge;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

interface CardItem {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const EMOJIS = ["🌟", "🎨", "🎮", "🎯", "🎪", "🎭", "🎸", "🎺"];

export const MemoryChallenge = ({ challenge, onComplete, onCancel }: MemoryChallengeProps) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(challenge.time_limit);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffled);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 || cards.every(c => c.isMatched)) {
      setIsFinished(true);
      setTimeout(() => onComplete(score), 1500);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, cards, score]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      if (cards[first].emoji === cards[second].emoji) {
        setScore(score + 20);
        setCards(cards.map((card, idx) =>
          idx === first || idx === second ? { ...card, isMatched: true } : card
        ));
      }
      setTimeout(() => {
        setCards(cards.map((card, idx) =>
          flippedCards.includes(idx) && !card.isMatched
            ? { ...card, isFlipped: false }
            : card
        ));
        setFlippedCards([]);
      }, 1000);
    }
  }, [flippedCards]);

  const handleCardClick = (index: number) => {
    if (flippedCards.length >= 2 || cards[index].isFlipped || cards[index].isMatched) return;
    
    setCards(cards.map((card, idx) =>
      idx === index ? { ...card, isFlipped: true } : card
    ));
    setFlippedCards([...flippedCards, index]);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
      <Card className="w-full max-w-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold">{challenge.title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className={timeLeft < 30 ? "text-red-500 font-bold" : ""}>{timeLeft}с</span>
          </div>
          <div>Оноо: <span className="font-bold text-primary">{score}</span></div>
        </div>

        {!isFinished ? (
          <div className="grid grid-cols-4 gap-4">
            {cards.map((card, index) => (
              <div
                key={card.id}
                onClick={() => handleCardClick(index)}
                className={`aspect-square rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-center text-4xl ${
                  card.isFlipped || card.isMatched
                    ? "bg-primary/10"
                    : "bg-secondary/20 hover:bg-secondary/30"
                } ${card.isMatched ? "opacity-50" : ""}`}
              >
                {(card.isFlipped || card.isMatched) ? card.emoji : "❓"}
              </div>
            ))}
          </div>
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
