import { useEffect, useState } from "react";
import { Check, X, Star } from "lucide-react";

interface AnswerAnimationProps {
  isCorrect: boolean;
  xpEarned?: number;
  onComplete: () => void;
}

export const AnswerAnimation = ({ isCorrect, xpEarned = 0, onComplete }: AnswerAnimationProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onComplete}
    >
      <div
        className={`relative p-8 md:p-12 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 ${
          isCorrect ? "bg-green-500" : "bg-red-500"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          {isCorrect ? (
            <>
              <div className="animate-spin-slow">
                <Check className="h-16 md:h-20 w-16 md:w-20 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white animate-in slide-in-from-bottom-4 duration-500">
                Correct!
              </h2>
              {xpEarned > 0 && (
                <div className="flex items-center gap-2 text-xl md:text-2xl font-bold text-yellow-300 animate-in slide-in-from-bottom-4 duration-700 delay-300">
                  <Star className="h-5 w-5 md:h-6 md:w-6 fill-yellow-300" />
                  +{xpEarned} XP
                </div>
              )}
            </>
          ) : (
            <>
              <div className="animate-bounce">
                <X className="h-16 md:h-20 w-16 md:w-20 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white animate-in slide-in-from-bottom-4 duration-500">
                Wrong
              </h2>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

