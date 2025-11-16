import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import CreatePost from "./pages/CreatePost";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBugReports from "./pages/AdminBugReports";
import AdminActivityLogs from "./pages/AdminActivityLogs";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Navigation />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/community" element={<Community />} />
              <Route path="/create-post" element={<CreatePost />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/bug-reports" element={<AdminBugReports />} />
              <Route path="/admin/activity-logs" element={<AdminActivityLogs />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
