import { ArrowRight, Zap, Target, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/hero-banner.jpg";

const Landing = () => {
  const features = [
    {
      icon: Zap,
      title: "Gamified Learning",
      description: "Earn XP, level up, and unlock achievements as you study and share knowledge."
    },
    {
      icon: Target,
      title: "Progress Tracking",
      description: "Monitor your learning journey with detailed analytics and subject-based progress."
    },
    {
      icon: Users,
      title: "Study Community",
      description: "Connect with fellow learners, share materials, and learn together."
    },
    {
      icon: Trophy,
      title: "Rewards System",
      description: "Unlock exclusive badges, icons, and customization items through achievements."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-slide-in">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold font-gaming">
                  Level Up Your
                  <span className="block bg-gradient-primary bg-clip-text text-transparent">
                    Learning Journey
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-xl">
                  Join StudyQuest, the gamified learning platform where students share knowledge, 
                  earn XP, and unlock achievements while studying together.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-game-green hover:bg-game-green-dark text-lg font-semibold shadow-glow animate-glow">
                  Start Your Quest
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="border-game-green/50 hover:bg-game-green/10">
                  View Dashboard
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full"></div>
              <img 
                src={heroImage} 
                alt="StudyQuest Gaming Interface" 
                className="relative rounded-2xl shadow-elevated animate-bounce-in"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold font-gaming">Why Choose StudyQuest?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience learning like never before with our gamified approach to education
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="p-6 bg-gradient-card border-border/50 hover:border-game-green/50 transition-all duration-500 hover:shadow-glow group animate-slide-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="space-y-4">
                  <div className="p-3 bg-surface-elevated rounded-lg w-fit group-hover:bg-game-green/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-game-green" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-card">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold font-gaming mb-6">Ready to Begin Your Quest?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of students who are already leveling up their learning experience
          </p>
          <Button size="lg" className="bg-game-green hover:bg-game-green-dark text-lg font-semibold shadow-glow">
            Start Learning Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;