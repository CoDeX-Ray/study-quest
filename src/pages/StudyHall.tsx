import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rocket, BarChart3, Globe, User, Plus, ChevronRight,
  Star, Award, Flame,
  Trophy, Share2, Target, Users, Menu
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import StudyQuestLogo from "@/components/StudyQuestLogo";
import { ProfilePopupButton } from "@/components/ProfilePopupButton";
import { LeaderboardDialog } from "@/components/LeaderboardDialog";
import { CreateCardDialog } from "@/components/CreateCardDialog";
import { NotificationBell } from "@/components/NotificationBell";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  role: string;
  current_streak: number | null;
  longest_streak: number | null;
}

interface StudyCard {
  id: string;
  title: string;
  color: string;
  user_id: string;
  card_count?: number;
}

const StudyHall = () => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [myCards, setMyCards] = useState<StudyCard[]>([]);
  const [publicCards, setPublicCards] = useState<StudyCard[]>([]);
  const [selectedNav, setSelectedNav] = useState("progress");
  const [profileLoading, setProfileLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasCardsWithItems, setHasCardsWithItems] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      navigate("/admin/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (user && !loading) {
      Promise.all([
        fetchProfile(),
        fetchPosts(),
        fetchMyCards()
      ]).finally(() => {
        setDataLoading(false);
      });
    }
  }, [user, loading]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfileLoading(false);
      return;
    }

    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          try {
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || null,
                role: user.user_metadata?.role || 'student',
              })
              .select()
              .single();
            if (newProfile && !insertError) {
              setProfile(newProfile);
            }
          } catch (insertErr) {
            console.error("Error creating profile:", insertErr);
          }
        }
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  const fetchPosts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching posts:", error);
      } else if (data) {
        setPosts(data);
      }
    } catch (error) {
      console.error("Error in fetchPosts:", error);
    }
  }, [user]);

  const fetchMyCards = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Fetch cards
      const { data: cardsData, error: cardsError } = await supabase
        .from("study_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cardsError) {
        console.error("Error fetching cards:", cardsError);
        return;
      }

      if (cardsData && cardsData.length > 0) {
        // Fetch counts for all cards in one query
        const cardIds = cardsData.map(c => c.id);
        const { data: itemsData } = await supabase
          .from("study_card_items")
          .select("card_id")
          .in("card_id", cardIds);

        // Count items per card
        const countMap = new Map<string, number>();
        if (itemsData) {
          itemsData.forEach(item => {
            countMap.set(item.card_id, (countMap.get(item.card_id) || 0) + 1);
          });
        }

        // Map cards with count
        const cardsWithCount = cardsData.map(card => ({
          ...card,
          card_count: countMap.get(card.id) || 0
        }));

        setMyCards(cardsWithCount);
      } else {
        setMyCards([]);
      }
    } catch (error) {
      console.error("Error in fetchMyCards:", error);
    }
  }, [user]);

  const fetchPublicCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("study_cards")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching public cards:", error);
      } else if (data) {
        setPublicCards(data);
      }
    } catch (error) {
      console.error("Error in fetchPublicCards:", error);
    }
  }, []);

  // Check if there are any cards with items (optimized with single query)
  useEffect(() => {
    const checkCardsWithItems = async () => {
      const allCardIds = [...myCards.map(c => c.id), ...publicCards.map(c => c.id)];

      if (allCardIds.length === 0) {
        setHasCardsWithItems(false);
        return;
      }

      // Single query to check if any card has items
      const { data } = await supabase
        .from("study_card_items")
        .select("card_id")
        .in("card_id", allCardIds)
        .limit(1);

      setHasCardsWithItems(data && data.length > 0);
    };

    checkCardsWithItems();
  }, [myCards, publicCards]);

  // Show loading only during initial auth check
  if (loading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-game-green mx-auto"></div>
          <p className="text-muted-foreground">Loading Study Hall...</p>
        </div>
      </div>
    );
  }

  // Redirect if no user
  if (!user) {
    return null; // Will redirect via useEffect
  }


  // Get current date for streak calendar
  const today = new Date();
  const currentDate = today.getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const getDaysArray = () => {
    const days: (number | null)[] = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const handleStartQuest = async () => {
    // Check if user has any cards
    if (myCards.length === 0 && publicCards.length === 0) {
      toast.error("Please create a deck or browse public decks first");
      setSelectedNav("my-decks");
      return;
    }

    // Optimized: Find first card with items using a single query
    const allCardIds = [...myCards.map(c => c.id), ...publicCards.map(c => c.id)];

    // Get the first card that has items
    const { data: items } = await supabase
      .from("study_card_items")
      .select("card_id")
      .in("card_id", allCardIds)
      .order("card_id")
      .limit(1);

    if (items && items.length > 0) {
      navigate(`/study-quest?card=${items[0].card_id}`);
      return;
    }

    // If no cards with items found
    toast.error("No decks with cards available. Please create a deck with at least one card.");
    setSelectedNav("my-decks");
  };

  // Ensure we always have a valid profile to render
  const currentProfile: Profile = profile || {
    id: user?.id || '',
    full_name: user?.user_metadata?.full_name || null,
    avatar_url: null,
    xp: 0,
    level: 1,
    role: user?.user_metadata?.role || 'student',
    current_streak: null,
    longest_streak: null,
  };

  const maxXP = currentProfile.level * 100;
  const xpProgress = maxXP > 0 ? (currentProfile.xp % maxXP) / maxXP * 100 : 0;
  const roleDisplay = currentProfile.role.charAt(0).toUpperCase() + currentProfile.role.slice(1);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Left Sidebar - Hidden on mobile, shown on desktop */}
      <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-6">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            <span className="text-xl font-bold">StudyQuest</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => setSelectedNav("progress")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                selectedNav === "progress"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              }`}
            >
              <Rocket className="h-5 w-5" />
              <span>Progress</span>
            </button>
            <button
              onClick={() => setSelectedNav("my-decks")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                selectedNav === "my-decks"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span>My decks</span>
            </button>
            <button
              onClick={() => {
                setSelectedNav("public-decks");
                if (publicCards.length === 0) {
                  fetchPublicCards();
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                selectedNav === "public-decks"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              }`}
            >
              <Globe className="h-5 w-5" />
              <span>Public decks</span>
            </button>
            <button
              onClick={() => navigate("/profile")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                selectedNav === "profile"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              }`}
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="mt-6 space-y-2">
            <Button
              onClick={handleStartQuest}
              disabled={!hasCardsWithItems && (myCards.length === 0 && publicCards.length === 0)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title={!hasCardsWithItems && (myCards.length === 0 && publicCards.length === 0) ? "Create a deck with cards first" : "Start studying"}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Start Quest
            </Button>
            <CreateCardDialog onCardCreated={() => {
              fetchMyCards();
              setSelectedNav("my-decks");
            }}>
              <Button variant="outline" className="w-full border-2">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </CreateCardDialog>
          </div>
        </div>

        {/* My Decks Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-sidebar-foreground">My decks</h3>
            <CreateCardDialog onCardCreated={() => {
              fetchMyCards();
              setSelectedNav("my-decks");
            }}>
              <button className="text-sidebar-foreground/70 hover:text-sidebar-foreground">
                <Plus className="h-4 w-4" />
              </button>
            </CreateCardDialog>
          </div>
          <div className="space-y-2">
            {myCards.map((card) => (
              <button
                key={card.id}
                onClick={() => navigate(`/deck/${card.id}`)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-sidebar-accent/50 transition-colors group"
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: card.color }}
                />
                <span className="flex-1 text-left text-sm text-sidebar-foreground/80 group-hover:text-sidebar-foreground">
                  {card.title}
                </span>
                <ChevronRight className="h-4 w-4 text-sidebar-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
            {myCards.length === 0 && (
              <p className="text-sm text-sidebar-foreground/50 text-center py-4">
                No decks yet. Create one to get started!
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden fixed top-4 left-4 z-50">
          <Button variant="outline" size="icon" className="bg-background">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 mb-6">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              <span className="text-xl font-bold">StudyQuest</span>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              <button
                onClick={() => setSelectedNav("progress")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedNav === "progress"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <Rocket className="h-5 w-5" />
                <span>Progress</span>
              </button>
              <button
                onClick={() => setSelectedNav("my-decks")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedNav === "my-decks"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                <span>My decks</span>
              </button>
              <button
                onClick={() => {
                  setSelectedNav("public-decks");
                  if (publicCards.length === 0) {
                    fetchPublicCards();
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedNav === "public-decks"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <Globe className="h-5 w-5" />
                <span>Public decks</span>
              </button>
              <button
                onClick={() => navigate("/profile")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedNav === "profile"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <User className="h-5 w-5" />
                <span>Profile</span>
              </button>
            </nav>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2">
              <Button
                onClick={handleStartQuest}
                disabled={!hasCardsWithItems && (myCards.length === 0 && publicCards.length === 0)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title={!hasCardsWithItems && (myCards.length === 0 && publicCards.length === 0) ? "Create a deck with cards first" : "Start studying"}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Start Quest
              </Button>
              <CreateCardDialog onCardCreated={() => {
                fetchMyCards();
                setSelectedNav("my-decks");
              }}>
                <Button variant="outline" className="w-full border-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </CreateCardDialog>
            </div>
          </div>

          {/* My Decks Section */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-sidebar-foreground">My decks</h3>
              <CreateCardDialog onCardCreated={() => {
                fetchMyCards();
                setSelectedNav("my-decks");
              }}>
                <button className="text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </CreateCardDialog>
            </div>
            <div className="space-y-2">
              {myCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => navigate(`/study-quest?card=${card.id}`)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-sidebar-accent/50 transition-colors group"
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: card.color }}
                  />
                  <span className="flex-1 text-left text-sm text-sidebar-foreground/80 group-hover:text-sidebar-foreground">
                    {card.title}
                  </span>
                  <ChevronRight className="h-4 w-4 text-sidebar-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {myCards.length === 0 && (
                <p className="text-sm text-sidebar-foreground/50 text-center py-4">
                  No decks yet. Create one to get started!
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 mt-16 md:mt-0">
        {/* Top Header */}
        <header className="min-h-16 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-end px-3 md:px-6 py-2 shrink-0 gap-2">
          <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
            {/* Navigation Links - Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/study-hall")}
                className="text-foreground/80 hover:text-foreground text-xs"
              >
                Study Hall
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/community")}
                className="text-foreground/80 hover:text-foreground text-xs"
              >
                Community
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/announcements")}
                className="text-foreground/80 hover:text-foreground text-xs"
              >
                Announcements
              </Button>
            </div>
            {/* Mobile Navigation Menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-8">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => navigate("/study-hall")}
                  >
                    Study Hall
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => navigate("/community")}
                  >
                    Community
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => navigate("/announcements")}
                  >
                    Announcements
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => navigate("/profile")}
                  >
                    Profile
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            {/* XP Display - Hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-1 md:gap-2">
              <Star className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 fill-yellow-500 shrink-0" />
              <span className="font-semibold text-xs md:text-sm whitespace-nowrap">{currentProfile.xp}</span>
            </div>
            {/* Leaderboard - Desktop */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
              onClick={() => {
                const trigger = document.getElementById("leaderboard-trigger");
                if (trigger) trigger.click();
              }}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
            {/* Notification Bell */}
            <NotificationBell />
            {/* Profile Popup */}
            <ProfilePopupButton hideProfile={true} />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-y-auto bg-background">
          {selectedNav === "public-decks" ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold">Public Decks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicCards.map((card) => (
                  <Card
                    key={card.id}
                    className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/study-quest?card=${card.id}`)}
                  >
                    <div
                      className="w-full h-2 rounded mb-3"
                      style={{ backgroundColor: card.color }}
                    />
                    <h3 className="font-semibold mb-1">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Click to study
                    </p>
                  </Card>
                ))}
                {publicCards.length === 0 && (
                  <p className="text-muted-foreground col-span-full text-center py-8">
                    No public decks available yet.
                  </p>
                )}
              </div>
            </div>
          ) : selectedNav === "my-decks" ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold">My Decks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCards.map((card) => (
                  <Card
                    key={card.id}
                    className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/deck/${card.id}`)}
                  >
                    <div
                      className="w-full h-2 rounded mb-3"
                      style={{ backgroundColor: card.color }}
                    />
                    <h3 className="font-semibold mb-1">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {card.card_count || 0} {card.card_count === 1 ? 'card' : 'cards'}
                    </p>
                  </Card>
                ))}
                {myCards.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground mb-4">No decks yet.</p>
                    <CreateCardDialog onCardCreated={fetchMyCards}>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Deck
                      </Button>
                    </CreateCardDialog>
                  </div>
                )}
              </div>
            </div>
          ) : (
          <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            {/* Progress Card */}
            <Card className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 md:h-16 md:w-16">
                    <AvatarImage src={currentProfile.avatar_url || undefined} />
                    <AvatarFallback>
                      {currentProfile.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-xs font-bold">
                    {currentProfile.level}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-semibold mb-1">{roleDisplay}</h3>
                  <div className="space-y-2">
                    <Progress value={xpProgress} className="h-2" />
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground truncate pr-2">Level {currentProfile.level}: {maxXP} XP</span>
                      <span className="text-muted-foreground shrink-0">{currentProfile.xp} XP</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Grid - Compact Modern Design */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card className="p-3 md:p-4 bg-gradient-card border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total XP</p>
                    <p className="text-xl font-bold text-game-green">{currentProfile.xp}</p>
                  </div>
                  <Trophy className="h-5 w-5 text-game-green" />
                </div>
              </Card>
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Materials</p>
                    <p className="text-xl font-bold text-blue-500">{posts.length}</p>
                  </div>
                  <Share2 className="h-5 w-5 text-blue-500" />
                </div>
              </Card>
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Level</p>
                    <p className="text-xl font-bold text-level-gold">{currentProfile.level}</p>
                  </div>
                  <Award className="h-5 w-5 text-level-gold" />
                </div>
              </Card>
              <Card className="p-4 bg-gradient-card border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Role</p>
                    <p className="text-xl font-bold text-purple-500">{roleDisplay}</p>
                  </div>
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
              </Card>
            </div>

            {/* Streak Card */}
            <Card className="p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold mb-4">Start your streak!</h3>
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                {/* Calendar */}
                <div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                      <div key={day} className="text-center text-xs text-muted-foreground font-medium">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysArray().map((day, index) => (
                      <div
                        key={index}
                        className={`aspect-square rounded-full flex items-center justify-center text-xs ${
                          day === currentDate
                            ? "bg-red-500 text-white font-bold"
                            : day
                            ? "bg-muted text-muted-foreground"
                            : ""
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Streak Progress */}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-3xl md:text-4xl font-bold mb-2">
                    {currentProfile.current_streak || 0}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
                    {currentProfile.current_streak && currentProfile.current_streak > 0
                      ? "Day streak! 🔥"
                      : "Complete a deck to start your streak"}
                  </p>
                  <div className="relative w-24 h-24 md:w-32 md:h-32">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * 0.9}`}
                        className="text-red-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Flame className="h-8 w-8 md:h-12 md:w-12 text-orange-500" />
                    </div>
                  </div>
                  <Button
                    onClick={handleStartQuest}
                    disabled={!hasCardsWithItems && (myCards.length === 0 && publicCards.length === 0)}
                    className="mt-6 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!hasCardsWithItems && (myCards.length === 0 && publicCards.length === 0) ? "Create a deck with cards first" : "Start studying"}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Start streak
                  </Button>
                </div>
              </div>
            </Card>
          </div>
          )}
        </main>
      </div>

      {/* Leaderboard Dialog */}
      <LeaderboardDialog />
    </div>
  );
};

export default StudyHall;
