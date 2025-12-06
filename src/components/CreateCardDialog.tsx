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

interface CreateCardDialogProps {
  children: React.ReactNode;
  onCardCreated?: () => void;
}

const CARD_COLORS = [
  "#6366f1", // indigo
  "#ef4444", // red
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ec4899", // pink
];

export const CreateCardDialog = ({ children, onCardCreated }: CreateCardDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) {
      toast.error("Please enter a title for your card deck");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("study_cards")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          color: selectedColor,
          is_public: isPublic,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Card deck created successfully!");
      setTitle("");
      setDescription("");
      setOpen(false);
      onCardCreated?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to create card deck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Study Card Deck</DialogTitle>
          <DialogDescription>
            Create a new flashcard deck to help you study
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Art App 2.0"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your deck"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {CARD_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    selectedColor === color
                      ? "border-foreground scale-110"
                      : "border-border hover:border-foreground/50"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="public">Make this deck public</Label>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
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
              {loading ? "Creating..." : "Create Deck"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
