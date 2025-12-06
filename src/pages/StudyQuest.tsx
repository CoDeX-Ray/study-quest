import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X, ChevronDown, ChevronsLeft, ChevronsRight, RotateCcw, BookOpen, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShareCardDialog } from "@/components/ShareCardDialog";
import { AddCardItemDialog } from "@/components/AddCardItemDialog";
import { AnswerAnimation } from "@/components/AnswerAnimation";
import { LeaderboardDialog } from "@/components/LeaderboardDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Home, Trophy, CheckCircle2 } from "lucide-react";

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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [correct, setCorrect] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationData, setAnimationData] = useState<{ isCorrect: boolean; xpEarned: number } | null>(null);
  const [sessionXP, setSessionXP] = useState(0);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && cardId) {
      fetchCard();
    } else if (user && !cardId) {
      // If no card specified, navigate to study hall
      navigate("/study-hall");
    }
  }, [user, cardId, navigate]);

  // Generate multiple choice options from answer
  const generateMultipleChoice = (correctAnswer: string): string[] => {
    const answer = correctAnswer.trim();
    let options: string[] = [answer];
    
    // Try to parse as number
    const numAnswer = parseFloat(answer);
    if (!isNaN(numAnswer)) {
      // Generate 3 wrong answers
      const wrongAnswers = [
        numAnswer + 1,
        numAnswer - 1,
        numAnswer === 0 ? 1 : numAnswer * 2,
      ].filter((val, idx, arr) => arr.indexOf(val) === idx && val !== numAnswer);
      
      options = [answer, ...wrongAnswers.map(String)].slice(0, 4);
    } else {
      // For text answers, generate variations
      const variations = [
        answer + "s",
        answer.substring(0, Math.max(0, answer.length - 1)),
        answer.toUpperCase(),
        answer.charAt(0).toUpperCase() + answer.slice(1),
      ].filter(v => v !== answer);
      
      options = [answer, ...variations].slice(0, 4);
    }
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    return options;
  };

  const currentItem = items[currentIndex];
  const multipleChoiceOptions = useMemo(() => {
    if (!currentItem) return [];
    return generateMultipleChoice(currentItem.back);
  }, [currentItem]);

  // Reset state when cardId changes
  useEffect(() => {
    if (cardId) {
      setCurrentIndex(0);
      setIsRevealed(false);
      setSelectedAnswer(null);
      setAnswered(new Set());
      setCorrect(new Set());
      setShowAnimation(false);
      setAnimationData(null);
      setSessionXP(0);
    }
  }, [cardId]);

  // Reset state when moving to next card
  useEffect(() => {
    setIsRevealed(false);
    setSelectedAnswer(null);
  }, [currentIndex]);

  const fetchCard = async () => {
    if (!cardId) return;

    setLoading(true);
    try {
      // Fetch card
      const { data: cardData, error: cardError } = await supabase
        .from("study_cards")
        .select("*")
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
      console.error("Error fetching card:", error);
      toast.error(error.message || "Failed to load card");
      setLoading(false);
      // Navigate back after showing error
      setTimeout(() => {
        navigate("/study-hall");
      }, 2000);
      return;
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

  const handleReveal = () => {
    if (!currentItem) return;
    setIsRevealed(true);
    
    // If no answer was selected, mark as answered but not correct
    if (selectedAnswer === null) {
      const itemId = currentItem.id;
      setAnswered((prev) => new Set([...prev, itemId]));
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (!currentItem || isRevealed || selectedAnswer !== null) return;
    
    setSelectedAnswer(answer);
    const itemId = currentItem.id;
    const correctAnswer = currentItem.back.toLowerCase().trim();
    const selectedAnswerLower = answer.toLowerCase().trim();
    
    // Strict answer checking - only exact match or very close match
    // Remove extra whitespace and compare
    const normalizedCorrect = correctAnswer.replace(/\s+/g, ' ').trim();
    const normalizedSelected = selectedAnswerLower.replace(/\s+/g, ' ').trim();
    
    // Check for exact match first
    let isCorrect = normalizedCorrect === normalizedSelected;
    
    // If not exact, check if it's a number and compare numerically
    if (!isCorrect) {
      const numCorrect = parseFloat(normalizedCorrect);
      const numSelected = parseFloat(normalizedSelected);
      if (!isNaN(numCorrect) && !isNaN(numSelected)) {
        isCorrect = numCorrect === numSelected;
      }
    }
    
    // Only mark as answered - XP will only be awarded if correct
    setAnswered((prev) => new Set([...prev, itemId]));
    const xpEarned = isCorrect ? 10 : 0;
    
    // Only add XP if answer is correct
    if (isCorrect) {
      setCorrect((prev) => new Set([...prev, itemId]));
      setSessionXP(prev => prev + xpEarned);
    } else {
      // Wrong answer - no XP
      setSessionXP(prev => prev + 0);
    }

    // Show animation
    setAnimationData({ isCorrect, xpEarned });
    setShowAnimation(true);
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsRevealed(false);
    setSelectedAnswer(null);
    setAnswered(new Set());
    setCorrect(new Set());
    setSessionXP(0); // Reset XP when resetting
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setAnimationData(null);
    
    // Move to next card after a delay
    setTimeout(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Last card, save session when all cards are answered
        if (answered.size === items.length) {
          saveStudySession();
        }
      }
    }, 1000);
  };

  const saveStudySession = async () => {
    if (!user || !cardId || items.length === 0) return;

    try {
      const questionsAnswered = answered.size;
      const correctAnswers = correct.size;
      // Calculate total XP earned (10 XP per correct answer) - only from correct answers
      const totalXPEarned = correctAnswers * 10;

      // Save study session - the database trigger will handle XP and streak updates
      const { error: sessionError } = await supabase.from("study_sessions").insert({
        user_id: user.id,
        card_id: cardId,
        questions_answered: questionsAnswered,
        correct_answers: correctAnswers,
        xp_earned: totalXPEarned,
        session_date: new Date().toISOString().split('T')[0], // Current date
      });

      if (sessionError) {
        throw sessionError;
      }

      // Show completion dialog after saving
      setShowCompletionDialog(true);
    } catch (error: any) {
      console.error("Error saving study session:", error);
      toast.error(error.message || "Failed to save progress");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <Button variant="ghost" onClick={() => navigate("/study-hall")} className="mb-4 text-gray-400 hover:text-white">
          <X className="h-4 w-4 mr-2" />
          Back to Study Hall
        </Button>
        <Card className="p-6 md:p-8 text-center bg-gray-800 border-gray-700">
          <p className="text-gray-300">Card deck not found.</p>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/study-hall")} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">{card.title}</h1>
                {card.description && (
                  <p className="text-sm text-gray-400">{card.description}</p>
                )}
              </div>
            </div>
          </div>
          <Card className="p-8 text-center space-y-4 bg-gray-800 border-gray-700">
            <p className="text-gray-300">No flashcards in this deck yet.</p>
            {card.user_id === user?.id && (
              <AddCardItemDialog cardId={cardId!} onItemAdded={fetchCard}>
                <Button className="bg-pink-500 hover:bg-pink-600">
                  Add First Card
                </Button>
              </AddCardItemDialog>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Safety check for currentItem
  if (!currentItem || !items[currentIndex]) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <Button variant="ghost" onClick={() => navigate("/study-hall")} className="mb-4 text-gray-400 hover:text-white">
          <X className="h-4 w-4 mr-2" />
          Back to Study Hall
        </Button>
        <Card className="p-6 md:p-8 text-center bg-gray-800 border-gray-700">
          <p className="text-gray-300">Error loading card. Please try again.</p>
        </Card>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / items.length) * 100;
  const correctAnswer = currentItem.back.toLowerCase().trim();
  
  // Calculate if answer is correct (same logic as in handleAnswerSelect)
  const calculateIsCorrect = (answer: string): boolean => {
    const normalizedCorrect = correctAnswer.replace(/\s+/g, ' ').trim();
    const normalizedSelected = answer.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Check for exact match first
    if (normalizedCorrect === normalizedSelected) return true;
    
    // If not exact, check if it's a number and compare numerically
    const numCorrect = parseFloat(normalizedCorrect);
    const numSelected = parseFloat(normalizedSelected);
    if (!isNaN(numCorrect) && !isNaN(numSelected)) {
      return numCorrect === numSelected;
    }
    
    return false;
  };
  
  const isAnswerCorrect = selectedAnswer ? calculateIsCorrect(selectedAnswer) : false;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {showAnimation && animationData && (
        <AnswerAnimation
          isCorrect={animationData.isCorrect}
          xpEarned={animationData.xpEarned}
          onComplete={handleAnimationComplete}
        />
      )}
      
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 flex flex-col flex-1 min-h-0 w-full">
        {/* Top Section - Sticky */}
        <div className="space-y-4 mb-4 sm:mb-6 flex-shrink-0">
          {/* Close button and progress bar */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/study-hall")}
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Subject dropdown, XP, and navigation */}
          <div className="flex items-center justify-between">
            {/* Left navigation arrow */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="h-10 w-10 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
            >
              <ChevronsLeft className="h-5 w-5" />
            </Button>

            {/* Center: Subject dropdown, XP, and Reset */}
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: card.color || "#ec4899" }}
                    />
                    <span className="font-medium">{card.title}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem 
                    onClick={() => navigate("/study-hall")}
                    className="text-white hover:bg-gray-700"
                  >
                    Change Subject
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="text-sm font-medium text-pink-400">
                + {sessionXP} XP
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
                title="Reset all progress"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Right navigation arrow */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === items.length - 1}
              className="h-10 w-10 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
            >
              <ChevronsRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content Box - Optimized height */}
        <Card className="border-2 border-pink-500/30 bg-gray-800 rounded-lg p-4 sm:p-6 mb-3 sm:mb-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Top bar with Learning label and menu */}
          <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Learning</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                {card.user_id === user?.id && (
                  <>
                    <AddCardItemDialog cardId={cardId!} onItemAdded={fetchCard}>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        className="text-white hover:bg-gray-700"
                      >
                        Add Card
                      </DropdownMenuItem>
                    </AddCardItemDialog>
                    <ShareCardDialog cardId={cardId!} cardTitle={card.title}>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        className="text-white hover:bg-gray-700"
                      >
                        Share
                      </DropdownMenuItem>
                    </ShareCardDialog>
                  </>
                )}
                <DropdownMenuItem 
                  onClick={handleReset}
                  className="text-white hover:bg-gray-700"
                >
                  Reset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Question/Answer Display - Scrollable if needed */}
          <div className="flex-1 flex items-center justify-center overflow-y-auto">
            <div className="text-center space-y-2 sm:space-y-4 w-full px-2">
              {!isRevealed ? (
                <div className="space-y-2 sm:space-y-4">
                  <div className="space-y-2">
                    <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white break-words">
                      {currentItem.front.includes("_") || currentItem.front.includes("?") 
                        ? currentItem.front.replace(/[_\?]/g, "____")
                        : currentItem.front}
                    </p>
                    {/* Don't show answer until revealed */}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-4">
                  <div className="space-y-2">
                    <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white break-words">
                      {currentItem.front.includes("_") || currentItem.front.includes("?")
                        ? currentItem.front.replace(/[_\?]/g, currentItem.back)
                        : currentItem.front}
                    </p>
                    {currentItem.back && (
                      <>
                        <div className="border-t border-dashed border-gray-600 my-2"></div>
                        <p className="text-lg sm:text-xl md:text-2xl font-semibold text-white break-words">
                          {currentItem.back}
                        </p>
                      </>
                    )}
                  </div>
                  {selectedAnswer && (
                    <div className={`mt-2 sm:mt-4 text-lg sm:text-xl font-semibold ${
                      isAnswerCorrect ? "text-green-400" : "text-red-400"
                    }`}>
                      {isAnswerCorrect ? "✓ Correct!" : "✗ Incorrect"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Multiple Choice Grid - Optimized to fit screen */}
        {!isRevealed && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
            {multipleChoiceOptions.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option.toLowerCase().trim() === correctAnswer;
              const showResult = selectedAnswer !== null;
              
              return (
                <Button
                  key={idx}
                  variant="outline"
                  onClick={() => handleAnswerSelect(option)}
                  disabled={selectedAnswer !== null}
                  className={`h-14 sm:h-16 md:h-20 text-sm sm:text-base md:text-lg font-medium ${
                    showResult && isCorrectOption
                      ? "bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30"
                      : showResult && isSelected && !isCorrectOption
                      ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                      : isSelected
                      ? "bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/30"
                      : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  }`}
                >
                  {option}
                </Button>
              );
            })}
          </div>
        )}

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 space-y-2">
          {!isRevealed && (
            <Button
              onClick={handleReveal}
              className="w-full h-10 sm:h-12 bg-gray-800 border-2 border-gray-700 hover:bg-gray-700 text-white font-medium"
            >
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Reveal
            </Button>
          )}
          
          {/* Next button after answer is selected or revealed */}
          {(selectedAnswer !== null || isRevealed) && currentIndex < items.length - 1 && (
            <Button
              onClick={handleNext}
              className="w-full h-10 sm:h-12 bg-pink-500 hover:bg-pink-600 text-white font-medium"
            >
              Next Question
            </Button>
          )}
        </div>

        {/* Completion Dialog */}
        <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center text-green-400">
                Great job! 🎉
              </DialogTitle>
              <DialogDescription className="text-center text-gray-300 pt-2">
                You completed {card.title} with {correct.size} out of {items.length} correct answers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-green-400">
                  Total XP Earned: {sessionXP} XP
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setShowCompletionDialog(false);
                    // Show detailed correct answers summary
                    const correctCount = correct.size;
                    const totalCount = items.length;
                    const percentage = Math.round((correctCount / totalCount) * 100);
                    toast.success(
                      `You got ${correctCount} out of ${totalCount} correct (${percentage}%)! ${correctCount === totalCount ? 'Perfect score! 🎯' : 'Keep practicing!'}`,
                      { duration: 5000 }
                    );
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  See Correct
                </Button>
                <Button
                  onClick={() => {
                    setShowCompletionDialog(false);
                    // Trigger leaderboard dialog
                    setTimeout(() => {
                      const trigger = document.getElementById("leaderboard-trigger");
                      if (trigger) trigger.click();
                    }, 100);
                  }}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Trophy className="h-5 w-5 mr-2" />
                  Leaderboards
                </Button>
                <Button
                  onClick={() => {
                    setShowCompletionDialog(false);
                    navigate("/study-hall");
                  }}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Home
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Leaderboard Dialog */}
        <LeaderboardDialog />
      </div>
    </div>
  );
};

export default StudyQuest;