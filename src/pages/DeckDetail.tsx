import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Rocket, Trash2, Edit2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddCardItemDialog } from "@/components/AddCardItemDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface StudyCard {
  id: string;
  title: string;
  description: string | null;
  color: string;
  user_id: string;
}

interface CardItem {
  id: string;
  front: string;
  back: string;
  order_index: number;
}

const DeckDetail = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { deckId } = useParams<{ deckId: string }>();
  const [card, setCard] = useState<StudyCard | null>(null);
  const [items, setItems] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteCardDialogOpen, setDeleteCardDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && deckId) {
      fetchDeck();
    }
  }, [user, deckId]);

  const fetchDeck = async () => {
    if (!deckId) return;

    setLoading(true);
    try {
      const { data: cardData, error: cardError } = await supabase
        .from("study_cards")
        .select("*")
        .eq("id", deckId)
        .single();

      if (cardError) throw cardError;

      // Check if user owns this card
      if (cardData.user_id !== user?.id) {
        toast.error("You don't have access to this deck");
        navigate("/study-hall");
        return;
      }

      setCard(cardData);

      // Fetch card items
      const { data: itemsData, error: itemsError } = await supabase
        .from("study_card_items")
        .select("*")
        .eq("card_id", deckId)
        .order("order_index", { ascending: true });

      if (itemsError) throw itemsError;

      setItems(itemsData || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load deck");
      navigate("/study-hall");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!deckId || !user) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("study_cards")
        .delete()
        .eq("id", deckId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Deck deleted successfully");
      navigate("/study-hall");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete deck");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleStartQuest = () => {
    if (items.length === 0) {
      toast.error("Please add at least one card before starting");
      return;
    }
    navigate(`/study-quest?card=${deckId}`);
  };

  const handleEditCard = (cardItem: CardItem) => {
    setEditingCard(cardItem);
    setEditFront(cardItem.front);
    setEditBack(cardItem.back);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCard || !editFront.trim() || !editBack.trim()) {
      toast.error("Please fill in both front and back");
      return;
    }

    try {
      const { error } = await supabase
        .from("study_card_items")
        .update({
          front: editFront.trim(),
          back: editBack.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCard.id);

      if (error) throw error;

      toast.success("Card updated successfully");
      setEditDialogOpen(false);
      setEditingCard(null);
      fetchDeck();
    } catch (error: any) {
      toast.error(error.message || "Failed to update card");
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;

    setDeletingCard(true);
    try {
      const { error } = await supabase
        .from("study_card_items")
        .delete()
        .eq("id", cardToDelete)
        .eq("card_id", deckId);

      if (error) throw error;

      toast.success("Card deleted successfully");
      setDeleteCardDialogOpen(false);
      setCardToDelete(null);
      fetchDeck();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete card");
    } finally {
      setDeletingCard(false);
    }
  };

  const openDeleteCardDialog = (cardId: string) => {
    setCardToDelete(cardId);
    setDeleteCardDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-game-green mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-game-green mx-auto"></div>
          <p className="text-muted-foreground">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/study-hall")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: card.color }}
                />
                <h1 className="text-xl md:text-2xl font-bold">{card.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-xl font-semibold">No cards yet</h3>
              <p className="text-muted-foreground">Add some cards to start quizzing.</p>
              <AddCardItemDialog cardId={deckId!} onItemAdded={fetchDeck}>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </AddCardItemDialog>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Sticky Header with Start Quest and Add Card */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 border-b border-border">
              <div className="flex items-center justify-between gap-4">
                <AddCardItemDialog cardId={deckId!} onItemAdded={fetchDeck}>
                  <Button variant="outline" size="lg" className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Card
                  </Button>
                </AddCardItemDialog>
                <Button
                  onClick={handleStartQuest}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Start Quest
                </Button>
              </div>
            </div>

            {/* Cards List */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <Card key={item.id} className="p-4 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Card {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Front:</p>
                        <p className="font-medium">{item.front}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Back:</p>
                        <p className="text-muted-foreground">{item.back}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditCard(item)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteCardDialog(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>

          </div>
        )}
      </div>

      {/* Delete Deck Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{card.title}"? This action cannot be undone and will delete all cards in this deck.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeck}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Card Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-front">Front (Question) *</Label>
              <Textarea
                id="edit-front"
                value={editFront}
                onChange={(e) => setEditFront(e.target.value)}
                placeholder="Enter the question or front side of the card"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-back">Back (Answer) *</Label>
              <Textarea
                id="edit-back"
                value={editBack}
                onChange={(e) => setEditBack(e.target.value)}
                placeholder="Enter the answer or back side of the card"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingCard(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirmation Dialog */}
      <AlertDialog open={deleteCardDialogOpen} onOpenChange={setDeleteCardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCard}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              disabled={deletingCard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingCard ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeckDetail;

