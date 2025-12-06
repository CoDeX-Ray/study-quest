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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Image, List, ListOrdered, Sigma } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  const [frontAndBack, setFrontAndBack] = useState(true);

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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ec4899" }} />
            Add Flashcard
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Flashcard Preview */}
          <Card className="p-6 md:p-8 min-h-[300px] flex items-center justify-center border-2">
            <div className="w-full space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Front</Label>
                <div className="p-4 bg-muted/50 rounded-lg min-h-[100px]">
                  {front || <span className="text-muted-foreground">1 + 2</span>}
                </div>
              </div>
              {frontAndBack && (
                <>
                  <div className="border-t border-dashed" />
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Back</Label>
                    <div className="p-4 bg-muted/50 rounded-lg min-h-[100px]">
                      {back || <span className="text-muted-foreground">3</span>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-between border-t border-b py-3">
            <div className="flex items-center gap-3">
              <Label htmlFor="front-back-toggle" className="text-sm">Front and back</Label>
              <Switch
                id="front-back-toggle"
                checked={frontAndBack}
                onCheckedChange={setFrontAndBack}
              />
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <Image className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <List className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <Sigma className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="front">Front (Question) *</Label>
              <Textarea
                id="front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Enter the question or front side of the card"
                rows={3}
                required
                className="resize-none"
              />
            </div>
            {frontAndBack && (
              <div className="space-y-2">
                <Label htmlFor="back">Back (Answer) *</Label>
                <Textarea
                  id="back"
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="Enter the answer or back side of the card"
                  rows={3}
                  required
                  className="resize-none"
                />
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Saving..." : "Save"}
              <span className="ml-2 text-xs text-muted-foreground">Ctrl + d</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
