import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import { AuthProvider } from "./hooks/useAuth";

// Lazy load pages for better performance
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StudyHall = lazy(() => import("./pages/StudyHall"));
const StudyQuest = lazy(() => import("./pages/StudyQuest"));
const DeckDetail = lazy(() => import("./pages/DeckDetail"));
const Community = lazy(() => import("./pages/Community"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminBugReports = lazy(() => import("./pages/AdminBugReports"));
const AdminActivityLogs = lazy(() => import("./pages/AdminActivityLogs"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminAnnouncements = lazy(() => import("./pages/AdminAnnouncements"));
const Announcements = lazy(() => import("./pages/Announcements"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
