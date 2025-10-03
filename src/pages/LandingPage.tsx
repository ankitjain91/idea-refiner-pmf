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
      <section className="container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-xs font-medium">
            Zero Wrinkles Required™
          </Badge>
          <h1 className="text-6xl md:text-7xl font-semibold tracking-tight leading-[1.1]">
            Your Brain Might Be Smooth
            <span className="block text-accent mt-3">But Your Ideas Don't Have To Be</span>
          </h1>
          <p className="text-xl text-secondary-foreground max-w-2xl mx-auto leading-relaxed">
            We add the wrinkles to your perfectly smooth brain, turning those shower thoughts 
            into Silicon Valley gold. No PhD required, just vibes and ambition.
          </p>
          <div className="flex items-center justify-center gap-4 pt-6">
            <Button 
              size="lg" 
              onClick={() => setShowAuthModal(true)}
              className="gap-2 rounded-full px-8"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="ghost"
              onClick={() => navigate('/pricing')}
              className="rounded-full px-8"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-24 border-t">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4">Add Some Texture to That Smooth Dome</h2>
            <p className="text-secondary-foreground text-lg">
              Tools so smart, they'll make your brain look like a topographical map
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-sm transition-shadow">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-card-hover rounded-lg">
                        <feature.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                        <p className="text-secondary-foreground leading-relaxed">
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
      <section className="container mx-auto px-6 py-24 border-t">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
              <div className="text-5xl font-semibold mb-2">10K+</div>
              <div className="text-sm text-secondary-foreground">Smooth Brains</div>
            </div>
            <div>
              <div className="text-5xl font-semibold mb-2">50K+</div>
              <div className="text-sm text-secondary-foreground">Wrinkles Added</div>
            </div>
            <div>
              <div className="text-5xl font-semibold mb-2">0%</div>
              <div className="text-sm text-secondary-foreground">Brain Cells Required</div>
            </div>
            <div>
              <div className="text-5xl font-semibold mb-2">∞</div>
              <div className="text-sm text-secondary-foreground">Smoothness Level</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-6 py-24 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold mb-4">Pricing smoother than your cerebellum</h2>
            <p className="text-secondary-foreground text-lg">
              Pick your wrinkle intensity level
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
                      <span className="text-4xl font-semibold">{plan.price}</span>
                      <span className="text-secondary-foreground ml-2">/{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-accent flex-shrink-0" />
                          <span className="text-secondary-foreground">{feature}</span>
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

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-24 border-t">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-semibold">Ready to evolve that smooth brain?</h2>
            <p className="text-secondary-foreground text-lg">
              Join thousands of fellow smoothies who went from zero wrinkles to venture capital
            </p>
          <Button 
            size="lg" 
            onClick={() => setShowAuthModal(true)}
            className="gap-2 rounded-full px-8"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Button>
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