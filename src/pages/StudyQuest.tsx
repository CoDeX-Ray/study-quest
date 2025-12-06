import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, Check, X, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShareCardDialog } from "@/components/ShareCardDialog";
import { AddCardItemDialog } from "@/components/AddCardItemDialog";

interface StudyCard {
  id: string;
  title: string;
  description: string | null;
  color: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
  };
}

interface CardItem {
  id: string;
  front: string;
  back: string;
  order_index: number;
}

const StudyQuest = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cardId = searchParams.get("card");

  const [card, setCard] = useState<StudyCard | null>(null);
  const [items, setItems] = useState<CardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [correct, setCorrect] = useState<Set<string>>(new Set());
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/study-hall");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && cardId) {
      fetchCard();
    } else if (user && !cardId) {
      // If no card specified, navigate to study hall
      navigate("/study-hall");
    }
  }, [user, cardId]);

  const fetchCard = async () => {
    if (!cardId) return;

    setLoading(true);
    try {
      // Fetch card with owner info
      const { data: cardData, error: cardError } = await supabase
        .from("study_cards")
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .eq("id", cardId)
        .single();

      if (cardError) throw cardError;

      // Check if user has access (owner, public, or shared)
      const isOwner = cardData.user_id === user?.id;
      const isPublic = cardData.is_public;
      const isShared = await checkIfShared(cardId);

      if (!isOwner && !isPublic && !isShared) {
        toast.error("You don't have access to this card");
        navigate("/study-hall");
        return;
      }

      setCard(cardData);

      // Fetch card items
      const { data: itemsData, error: itemsError } = await supabase
        .from("study_card_items")
        .select("*")
        .eq("card_id", cardId)
        .order("order_index", { ascending: true });

      if (itemsError) throw itemsError;

      setItems(itemsData || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load card");
      navigate("/study-hall");
    } finally {
      setLoading(false);
    }
  };

  const checkIfShared = async (cardId: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase
      .from("shared_cards")
      .select("id")
      .eq("card_id", cardId)
      .eq("shared_with_user_id", user.id)
      .single();
    return !!data;
  };

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      setShowAnswerInput(true);
      setUserAnswer("");
    } else {
      setIsFlipped(false);
      setShowAnswerInput(false);
    }
  };

  const checkAnswer = () => {
    if (!items[currentIndex] || !userAnswer.trim()) {
      toast.error("Please enter an answer");
      return;
    }

    const itemId = items[currentIndex].id;
    const correctAnswer = items[currentIndex].back.toLowerCase().trim();
    const userAnswerLower = userAnswer.toLowerCase().trim();
    
    // Check if answer is correct (exact match or contains key words)
    const isCorrect = correctAnswer === userAnswerLower || 
                     correctAnswer.includes(userAnswerLower) ||
                     userAnswerLower.includes(correctAnswer);

    setAnswered((prev) => new Set([...prev, itemId]));
    if (isCorrect) {
      setCorrect((prev) => new Set([...prev, itemId]));
      toast.success("Correct! ✅");
    } else {
      toast.error(`Incorrect. The answer is: ${items[currentIndex].back}`);
    }

    // Move to next card after a short delay
    setTimeout(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        setShowAnswerInput(false);
        setUserAnswer("");
      } else {
        // Last card, show completion
        setShowAnswerInput(false);
      }
    }, 2000);
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (!items[currentIndex]) return;

    const itemId = items[currentIndex].id;
    setAnswered((prev) => new Set([...prev, itemId]));
    if (isCorrect) {
      setCorrect((prev) => new Set([...prev, itemId]));
    }

    // Move to next card after a short delay
    setTimeout(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        setShowAnswerInput(false);
        setUserAnswer("");
      }
    }, 500);
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowAnswerInput(false);
      setUserAnswer("");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setShowAnswerInput(false);
      setUserAnswer("");
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowAnswerInput(false);
    setUserAnswer("");
    setAnswered(new Set());
    setCorrect(new Set());
  };

  const saveStudySession = async () => {
    if (!user || !cardId || items.length === 0) return;

    try {
      const questionsAnswered = answered.size;
      const correctAnswers = correct.size;
      // Only award XP if at least one question was answered correctly
      const xpEarned = correctAnswers > 0 ? correctAnswers * 10 : 0; // 10 XP per correct answer

      // Save study session - the database trigger will handle XP and streak updates
      const { error: sessionError } = await supabase.from("study_sessions").insert({
        user_id: user.id,
        card_id: cardId,
        questions_answered: questionsAnswered,
        correct_answers: correctAnswers,
        xp_earned: xpEarned,
        session_date: new Date().toISOString().split('T')[0], // Current date
      });

      if (sessionError) {
        throw sessionError;
      }

      // Fetch updated profile to show new XP/level
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("xp, level, current_streak")
        .eq("id", user.id)
        .single();

      if (updatedProfile && xpEarned > 0) {
        toast.success(`Earned ${xpEarned} XP! ${updatedProfile.current_streak > 0 ? `🔥 Streak: ${updatedProfile.current_streak}` : ''}`);
      } else if (questionsAnswered > 0) {
        toast.success("Progress saved!");
      }
    } catch (error: any) {
      console.error("Error saving study session:", error);
      toast.error(error.message || "Failed to save progress");
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Button variant="ghost" onClick={() => navigate("/study-hall")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Study Hall
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Card deck not found.</p>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/study-hall")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{card.title}</h1>
                {card.description && (
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                )}
              </div>
            </div>
          </div>
          <Card className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">No flashcards in this deck yet.</p>
            {card.user_id === user?.id && (
              <AddCardItemDialog cardId={cardId!} onItemAdded={fetchCard}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Card
                </Button>
              </AddCardItemDialog>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;
  const isComplete = currentIndex === items.length - 1 && answered.has(currentItem.id);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/study-hall")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{card.title}</h1>
              {card.description && (
                <p className="text-xs md:text-sm text-muted-foreground">{card.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {card.user_id === user?.id && (
              <>
                <AddCardItemDialog cardId={cardId!} onItemAdded={fetchCard}>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Card
                  </Button>
                </AddCardItemDialog>
                <ShareCardDialog cardId={cardId!} cardTitle={card.title}>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </ShareCardDialog>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Card {currentIndex + 1} of {items.length}
            </span>
            <span className="text-muted-foreground">
              {correct.size} / {answered.size} correct
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-game-green transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <Card
          className="min-h-[300px] md:min-h-[400px] flex items-center justify-center p-6 md:p-8 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => !showAnswerInput && handleFlip()}
        >
          <div className="text-center space-y-4 w-full">
            {!isFlipped ? (
              <div>
                <Badge variant="outline" className="mb-4">Question</Badge>
                <p className="text-xl md:text-2xl font-semibold">{currentItem.front}</p>
                <p className="text-sm text-muted-foreground mt-4">
                  Click to reveal answer
                </p>
              </div>
            ) : (
              <div className="w-full">
                <Badge variant="outline" className="mb-4">Answer</Badge>
                <p className="text-xl md:text-2xl font-semibold mb-4">{currentItem.back}</p>
                {!answered.has(currentItem.id) && (
                  <div className="space-y-3 mt-6">
                    <p className="text-sm font-medium">Type your answer:</p>
                    <Input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                      className="w-full max-w-md mx-auto"
                      placeholder="Enter your answer..."
                      autoFocus
                    />
                    <Button
                      onClick={checkAnswer}
                      className="bg-game-green hover:bg-game-green-dark"
                      disabled={!userAnswer.trim()}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Check Answer
                    </Button>
                  </div>
                )}
                {answered.has(currentItem.id) && (
                  <div className="mt-4">
                    {correct.has(currentItem.id) ? (
                      <Badge className="bg-game-green">Correct! ✅</Badge>
                    ) : (
                      <Badge variant="destructive">Incorrect ❌</Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === items.length - 1}
          >
            Next
          </Button>
        </div>

        {/* Completion */}
        {isComplete && (
          <Card className="p-6 bg-game-green/10 border-game-green/50">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold">Great job!</h3>
              <p className="text-muted-foreground">
                You completed {card.title} with {correct.size} out of {items.length} correct answers.
              </p>
              <Button onClick={saveStudySession} className="bg-game-green hover:bg-game-green-dark">
                Save Progress & Earn XP
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudyQuest;
