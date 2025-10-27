import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StudyQuestLogo from "./StudyQuestLogo";
import { Menu, User, LogOut, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navigation = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();

  return (
    <nav className={`border-b border-border/40 sticky top-0 z-50 backdrop-blur-lg ${isAdmin ? 'bg-gradient-to-r from-destructive/10 to-warning/10' : 'bg-surface/50'}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <StudyQuestLogo />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {!user ? (
              <>
                <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors">
                  Home
                </Link>
              </>
            ) : isAdmin ? (
              <>
                <Link to="/admin/dashboard" className="text-foreground/80 hover:text-foreground transition-colors flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin Dashboard
                </Link>
                <Link to="/dashboard" className="text-foreground/80 hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                <Link to="/community" className="text-foreground/80 hover:text-foreground transition-colors">
                  Community
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link to="/dashboard" className="text-foreground/80 hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                <Link to="/community" className="text-foreground/80 hover:text-foreground transition-colors">
                  Community
                </Link>
              </>
            )}
            {!user ? (
              <Link to="/auth">
                <Button>Sign In</Button>
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isAdmin && (
                    <Link to="/profile">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col gap-6 mt-8">
                {!user ? (
                  <>
                    <Link to="/" className="text-lg">Home</Link>
                    <Link to="/auth">
                      <Button className="w-full">Sign In</Button>
                    </Link>
                  </>
                ) : isAdmin ? (
                  <>
                    <Link to="/admin/dashboard" className="text-lg flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                    <Link to="/dashboard" className="text-lg">Dashboard</Link>
                    <Link to="/community" className="text-lg">Community</Link>
                    <Link to="/profile" className="text-lg">Profile</Link>
                    <Button onClick={signOut} variant="outline" className="w-full">
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/" className="text-lg">Home</Link>
                    <Link to="/dashboard" className="text-lg">Dashboard</Link>
                    <Link to="/community" className="text-lg">Community</Link>
                    <Link to="/profile" className="text-lg">Profile</Link>
                    <Button onClick={signOut} variant="outline" className="w-full">
                      Sign Out
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
