import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  ArrowRight, 
  Brain, 
  TrendingUp,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Building2,
  ChevronRight,
  Check,
  Sparkles,
  Activity,
  Target,
  Users,
  Database,
  GitBranch,
  Lock,
  Rocket,
  Star,
  Award,
  DollarSign,
  Send,
  Trophy
} from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LiveIdeaFeed } from "@/components/hub/LiveIdeaFeed";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = (location.state as any)?.from?.pathname as string | undefined;
  const shouldOpenAuthModal = (location.state as any)?.openAuthModal as boolean | undefined;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(shouldOpenAuthModal || false);

  useEffect(() => {
    if (shouldOpenAuthModal) {
      setShowAuthModal(true);
      setIsSignUp(false);
      window.history.replaceState({}, document.title);
    }
  }, [shouldOpenAuthModal]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(redirectPath || '/home', { replace: true });
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate(redirectPath || '/home', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectPath]);

  const handleSocialSignIn = async (provider: 'google') => {
    setSocialLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}${redirectPath || '/'}`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "An error occurred during authentication",
        variant: "destructive",
      });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (isSignUp) {
        authSchema.parse({ email, password, confirmPassword });

        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Please check your email to confirm your account.",
        });
        setShowAuthModal(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: isSignUp ? "Sign Up Failed" : "Sign In Failed",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const successStories = [
    {
      idea: "AI Fitness Coach App",
      score: 94,
      outcome: "Raised $2M seed funding",
      timeline: "Validated Dec 2023 → Funded Mar 2024",
      color: "from-primary to-accent",
      icon: Rocket
    },
    {
      idea: "Sustainable Packaging Startup",
      score: 92,
      outcome: "Now in 300+ retail stores",
      timeline: "Validated Jan 2024 → Launched May 2024",
      color: "from-secondary to-warning",
      icon: Award
    },
    {
      idea: "Remote Work SaaS Tool",
      score: 88,
      outcome: "Acquired by Microsoft",
      timeline: "Validated Feb 2024 → Acquired Oct 2024",
      color: "from-accent to-primary",
      icon: Star
    },
    {
      idea: "Creator Economy Platform",
      score: 91,
      outcome: "10K+ active users, $500K ARR",
      timeline: "Validated Mar 2024 → Profitable Dec 2024",
      color: "from-warning to-secondary",
      icon: DollarSign
    }
  ];

  const features = [
    {
      icon: Send,
      title: "Enter Your Idea",
      description: "Share your startup concept in plain English"
    },
    {
      icon: BarChart3,
      title: "Get Your Score",
      description: "Receive detailed market insights and validation"
    },
    {
      icon: Rocket,
      title: "Act On What Works",
      description: "Make confident decisions backed by data"
    }
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "month",
      description: "Perfect for getting started",
      features: [
        "3 idea validations per month",
        "Basic market analysis",
        "Community support",
        "7-day data retention"
      ],
      cta: "Get Started",
      variant: "outline" as const
    },
    {
      name: "Pro",
      price: "$29",
      period: "month",
      description: "For serious entrepreneurs",
      features: [
        "Unlimited idea validations",
        "Advanced market insights",
        "Priority support",
        "90-day data retention",
        "API access",
        "Custom reports"
      ],
      cta: "Upgrade to Pro",
      variant: "default" as const,
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For teams and agencies",
      features: [
        "Unlimited everything",
        "Dedicated account manager",
        "White-label options",
        "Team collaboration",
        "Custom integrations",
        "SLA guarantee"
      ],
      cta: "Contact Sales",
      variant: "outline" as const
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-foreground" />
              <span className="font-semibold text-base">SmoothBrains</span>
            </div>
            <div className="flex items-center gap-6">
              <ThemeToggle />
              <Button variant="ghost" size="sm" className="text-sm font-normal">
                Documentation
              </Button>
              <Button variant="ghost" size="sm" className="text-sm font-normal">
                Pricing
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAuthModal(true)}
                className="rounded-full"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
        <div className="container mx-auto px-6 py-32 relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-xs font-medium mb-6">
                <Sparkles className="h-3 w-3 inline mr-2" />
                Join 12,000+ Validated Ideas
              </Badge>
              <h1 className="text-6xl md:text-7xl font-semibold tracking-tight leading-[1.1]">
                Every Billion-Dollar Startup
                <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mt-3">
                  Started as an Idea
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mt-8">
                See which of your ideas could win, just like these founders did. 
                SmoothBrains helps you validate and launch with confidence.
              </p>
              <div className="flex items-center justify-center gap-4 pt-8">
                <Button 
                  size="lg" 
                  onClick={() => setShowAuthModal(true)}
                  className="gap-2 rounded-full px-8 bg-primary hover:bg-primary/90"
                >
                  Validate My Idea <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => document.getElementById('success-stories')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-full px-8"
                >
                  See Success Stories
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Floating Leaderboard Teaser */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8, type: "spring" }}
        className="fixed bottom-8 right-8 z-40"
      >
        <Card 
          className="overflow-hidden border-2 border-primary/30 bg-card/95 backdrop-blur-lg shadow-2xl hover:shadow-primary/20 transition-all duration-300 hover:scale-105 cursor-pointer group"
          onClick={() => navigate('/leaderboard')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-to-br from-warning to-accent">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">Live Leaderboard</h3>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">LIVE</Badge>
                </div>
                <p className="text-xs text-muted-foreground">See top-ranked ideas now</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Success Showcase */}
      <section id="success-stories" className="container mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-semibold mb-4">Real Ideas. Real Success.</h2>
            <p className="text-muted-foreground text-lg">
              People like you turned their ideas into thriving businesses with SmoothBrains
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/leaderboard')}
              className="mt-4 gap-2 rounded-full"
            >
              <Trophy className="h-4 w-4" />
              View Full Leaderboard
            </Button>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {successStories.map((story, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                  <div className={`h-2 bg-gradient-to-r ${story.color}`} />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${story.color}`}>
                        <story.icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0">
                        Score: {story.score}/100
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{story.idea}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-secondary">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">{story.outcome}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {story.timeline}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Motivation Callout */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-warning opacity-10" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center space-y-8"
          >
            <h2 className="text-5xl md:text-6xl font-bold leading-tight">
              From an idea on a napkin<br />
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                to a funded startup
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              SmoothBrains helps you take the first step with confidence
            </p>
            <Button 
              size="lg" 
              onClick={() => setShowAuthModal(true)}
              className="gap-2 rounded-full px-12 py-6 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              Try SmoothBrains Free <Sparkles className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-24 border-t">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">
              Three simple steps to validate your next big idea
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Feed Section */}
      <section className="container mx-auto px-6 py-24 border-t">
        <div className="max-w-5xl mx-auto">
          <LiveIdeaFeed />
        </div>
      </section>

      {/* Community & Stats */}
      <section className="container mx-auto px-6 py-24 border-t">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-5xl font-bold mb-4">12,000+</h3>
              <p className="text-xl text-muted-foreground">Ideas validated and counting</p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: "SmoothBrains gave me the confidence to quit my job and go all in", author: "Sarah K., SaaS Founder" },
              { quote: "The validation data was spot-on. We raised $1.5M based on these insights", author: "Mike T., Tech Startup" },
              { quote: "Finally, a tool that speaks entrepreneur, not corporate jargon", author: "Alex R., Creator Economy" }
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full bg-gradient-to-br from-card to-muted/20 border-2">
                  <CardContent className="p-6">
                    <Star className="h-8 w-8 text-warning mb-4" />
                    <p className="text-foreground italic mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                    <p className="text-sm text-muted-foreground font-medium">— {testimonial.author}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-6 py-24 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4">Choose Your Plan</h2>
            <p className="text-muted-foreground text-lg">
              Simple, transparent pricing for every stage
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className={`h-full ${plan.popular ? 'ring-2 ring-accent' : ''}`}>
                  {plan.popular && (
                    <div className="px-6 py-2 bg-accent text-white text-center text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-base">{plan.description}</CardDescription>
                    <div className="mt-6">
                      <span className="text-4xl font-semibold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground ml-2">/{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-secondary flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full rounded-full" 
                      variant={plan.variant}
                      onClick={() => setShowAuthModal(true)}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="container mx-auto px-6 py-24 border-t">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold mb-6">
              Don't Just Dream Your Startup.
              <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mt-2">
                Validate It.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of entrepreneurs who turned their ideas into reality
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => setShowAuthModal(true)}
                className="gap-2 rounded-full px-12 py-6 text-lg bg-primary hover:bg-primary/90"
              >
                Start Free <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/pricing')}
                className="rounded-full px-12 py-6 text-lg"
              >
                View Pricing
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-secondary-foreground" />
              <span className="text-sm text-secondary-foreground">© 2024 SmoothBrains. No wrinkles were harmed in the making.</span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#" className="text-sm text-secondary-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-secondary-foreground hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-secondary-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card>
              <CardHeader>
                <CardTitle>{isSignUp ? 'Create Account' : 'Welcome Back'}</CardTitle>
                <CardDescription>
                  {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSocialSignIn('google')}
                    disabled={socialLoading === 'google'}
                  >
                    Continue with Google
                  </Button>
                  <div className="text-center text-sm">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 ml-1"
                      onClick={() => setIsSignUp(!isSignUp)}
                    >
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowAuthModal(false)}
                  >
                    Cancel
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}