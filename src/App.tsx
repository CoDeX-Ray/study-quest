import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import StudyHall from "./pages/StudyHall";
import StudyQuest from "./pages/StudyQuest";
import DeckDetail from "./pages/DeckDetail";
import Community from "./pages/Community";
import CreatePost from "./pages/CreatePost";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBugReports from "./pages/AdminBugReports";
import AdminActivityLogs from "./pages/AdminActivityLogs";
import AdminUsers from "./pages/AdminUsers";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import Announcements from "./pages/Announcements";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-game-green mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <div className="min-h-screen bg-background text-foreground">
            <Navigation />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/study-hall" element={<StudyHall />} />
                <Route path="/deck/:deckId" element={<DeckDetail />} />
                <Route path="/study-quest" element={<StudyQuest />} />
                <Route path="/community" element={<Community />} />
                <Route path="/create-post" element={<CreatePost />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/bug-reports" element={<AdminBugReports />} />
                <Route path="/admin/activity-logs" element={<AdminActivityLogs />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                <Route path="/announcements" element={<Announcements />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
