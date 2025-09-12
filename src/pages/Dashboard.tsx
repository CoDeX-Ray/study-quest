import { BookOpen, Target, Users, TrendingUp, Award, Calendar } from "lucide-react";
import XPBar from "@/components/XPBar";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Dashboard = () => {
  const subjects = [
    { name: "Mathematics", progress: 85, color: "bg-blue-500" },
    { name: "Physics", progress: 72, color: "bg-purple-500" },
    { name: "Chemistry", progress: 90, color: "bg-green-500" },
    { name: "Biology", progress: 65, color: "bg-yellow-500" },
    { name: "History", progress: 78, color: "bg-red-500" },
  ];

  const recentAchievements = [
    { title: "Study Streak", description: "7 days in a row", icon: "🔥" },
    { title: "Knowledge Sharer", description: "Posted 10 study materials", icon: "📚" },
    { title: "Community Helper", description: "Helped 25 students", icon: "🤝" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-gaming">Dashboard</h1>
          <p className="text-muted-foreground">Track your learning progress and achievements</p>
        </div>

        {/* XP Bar */}
        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Your Progress</h2>
            <div className="flex items-center gap-2 text-level-gold">
              <Award className="h-5 w-5" />
              <span className="font-semibold">Level 12 Scholar</span>
            </div>
          </div>
          <XPBar currentXP={2840} maxXP={3500} level={12} />
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Study Hours"
            value="156"
            icon={<BookOpen className="h-6 w-6" />}
            trend="up"
          />
          <StatCard
            title="Materials Shared"
            value="23"
            icon={<Target className="h-6 w-6" />}
            trend="up"
          />
          <StatCard
            title="Community Rank"
            value="#42"
            icon={<Users className="h-6 w-6" />}
            trend="up"
          />
          <StatCard
            title="Weekly Growth"
            value="+15%"
            icon={<TrendingUp className="h-6 w-6" />}
            trend="up"
          />
        </div>

        {/* Subject Progress & Achievements */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Subject Progress */}
          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-xl font-semibold mb-6">Subject Progress</h3>
            <div className="space-y-6">
              {subjects.map((subject) => (
                <div key={subject.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{subject.name}</span>
                    <span className="text-sm text-muted-foreground">{subject.progress}%</span>
                  </div>
                  <Progress 
                    value={subject.progress} 
                    className="h-2 bg-muted"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Achievements */}
          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-xl font-semibold mb-6">Recent Achievements</h3>
            <div className="space-y-4">
              {recentAchievements.map((achievement, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-surface-elevated rounded-lg hover:bg-surface-overlay transition-colors">
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium">{achievement.title}</h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <div className="text-game-green font-semibold">+50 XP</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Study Calendar */}
        <Card className="p-6 bg-gradient-card border-border/50">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-game-green" />
            <h3 className="text-xl font-semibold">Study Activity</h3>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, i) => (
              <div
                key={i}
                className={`h-10 rounded-lg border border-border/50 flex items-center justify-center text-sm transition-all hover:border-game-green/50 ${
                  Math.random() > 0.3 
                    ? 'bg-game-green/20 text-game-green font-medium' 
                    : 'bg-surface-elevated text-muted-foreground hover:bg-surface-overlay'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;