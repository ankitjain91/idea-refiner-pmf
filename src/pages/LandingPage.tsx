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
  Lock
} from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

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
        navigate(redirectPath || '/ideachat', { replace: true });
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate(redirectPath || '/ideachat', { replace: true });
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

  const features = [
    {
      icon: Brain,
      title: "Wrinkle Generator 3000",
      description: "Our AI adds deep grooves to your smooth cortex, making you sound smart at parties"
    },
    {
      icon: BarChart3,
      title: "Charts That Make Sense",
      description: "Even your smoothest investor can understand these colorful lines going up"
    },
    {
      icon: Shield,
      title: "Protects Your Ego",
      description: "We encrypt your failed ideas so nobody will ever know about that pet rock 2.0"
    },
    {
      icon: Globe,
      title: "Worldwide Wrinkle Network",
      description: "Connect with other smooth brains globally who also thought NFT laundromats were genius"
    }
  ];

  const plans = [
    {
      name: "Smooth Starter",
      price: "$0",
      period: "forever smooth",
      description: "For brains with training wheels",
      features: [
        "3 wrinkle attempts per month",
        "Basic brain massage analytics",
        "Smooth brain support group",
        "7-day embarrassment deletion"
      ],
      cta: "Stay Smooth",
      variant: "outline" as const
    },
    {
      name: "Wrinkle Pro",
      price: "$29",
      period: "per brain fold",
      description: "Get those gyri growing",
      features: [
        "Unlimited wrinkle generation",
        "PhD-level brain grooves",
        "Emergency wrinkle hotline",
        "90-day genius retention",
        "Direct cortex API access",
        "Custom sulcus patterns"
      ],
      cta: "Get Wrinkly",
      variant: "default" as const,
      popular: true
    },
    {
      name: "Galaxy Brain",
      price: "Your Soul",
      period: "plus firstborn",
      description: "Achieve peak wrinklage",
      features: [
        "Infinite brain folds",
        "Personal neuroscientist",
        "Time travel to fix bad ideas",
        "Telepathic contracts",
        "Guaranteed VC funding",
        "Your own TED talk"
      ],
      cta: "Ascend Now",
      variant: "outline" as const
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">SmoothBrains</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button variant="ghost" size="sm">
                Documentation
              </Button>
              <Button variant="ghost" size="sm">
                Pricing
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="px-3 py-1">
            <Sparkles className="h-3 w-3 mr-1" />
            Zero Wrinkles Required™
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Your Brain Might Be Smooth
            <span className="block text-primary mt-2">But Your Ideas Don't Have To Be</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We add the wrinkles to your perfectly smooth brain, turning those shower thoughts 
            into Silicon Valley gold. No PhD required, just vibes and ambition.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button 
              size="lg" 
              onClick={() => setShowAuthModal(true)}
              className="gap-2"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/pricing')}
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Add Some Texture to That Smooth Dome</h2>
            <p className="text-muted-foreground">
              Tools so smart, they'll make your brain look like a topographical map
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground mt-1">Smooth Brains</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground mt-1">Wrinkles Added</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">0%</div>
              <div className="text-sm text-muted-foreground mt-1">Brain Cells Required</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted-foreground mt-1">Smoothness Level</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Pricing smoother than your cerebellum</h2>
            <p className="text-muted-foreground">
              Pick your wrinkle intensity level
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className={`h-full ${plan.popular ? 'border-primary' : 'border-border/50'}`}>
                  {plan.popular && (
                    <div className="px-6 py-2 bg-primary text-primary-foreground text-center text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground ml-2">/{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full" 
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

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to evolve that smooth brain?</h2>
            <p className="text-muted-foreground">
              Join thousands of fellow smoothies who went from zero wrinkles to venture capital
            </p>
          <Button 
            size="lg" 
            onClick={() => setShowAuthModal(true)}
            className="gap-2"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">© 2024 SmoothBrains. No wrinkles were harmed in the making.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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