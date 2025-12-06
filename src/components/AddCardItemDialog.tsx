import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface AddCardItemDialogProps {
  children: React.ReactNode;
  cardId: string;
  onItemAdded?: () => void;
}

export const AddCardItemDialog = ({ children, cardId, onItemAdded }: AddCardItemDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !front.trim() || !back.trim()) {
      toast.error("Please fill in both front and back of the card");
      return;
    }

    setLoading(true);
    try {
      // Get current max order_index
      const { data: existingItems } = await supabase
        .from("study_card_items")
        .select("order_index")
        .eq("card_id", cardId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrderIndex = existingItems && existingItems.length > 0
        ? existingItems[0].order_index + 1
        : 0;

      const { error } = await supabase
        .from("study_card_items")
        .insert({
          card_id: cardId,
          front: front.trim(),
          back: back.trim(),
          order_index: nextOrderIndex,
        });

      if (error) throw error;

      toast.success("Card added successfully!");
      setFront("");
      setBack("");
      setOpen(false);
      onItemAdded?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to add card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Flashcard</DialogTitle>
          <DialogDescription>
            Add a new flashcard to this deck
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="front">Front (Question) *</Label>
            <Textarea
              id="front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Enter the question or front side of the card"
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="back">Back (Answer) *</Label>
            <Textarea
              id="back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Enter the answer or back side of the card"
              rows={3}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Card"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
