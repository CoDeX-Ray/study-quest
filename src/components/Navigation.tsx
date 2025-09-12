import { Home, BarChart3, Users, Trophy } from "lucide-react";
import { NavLink } from "react-router-dom";
import StudyQuestLogo from "./StudyQuestLogo";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Dashboard", path: "/dashboard", icon: BarChart3 },
    { name: "Community", path: "/community", icon: Users },
  ];

  return (
    <nav className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <StudyQuestLogo />

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-game-green text-primary-foreground font-medium shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            ))}
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Trophy className="h-4 w-4 text-level-gold" />
              <span className="text-sm font-medium">Level 12</span>
            </div>
            <Button variant="outline" className="border-game-green/50 hover:bg-game-green/10">
              Profile
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;