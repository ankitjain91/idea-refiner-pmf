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
  Check, 
  Sparkles, 
  TrendingUp, 
  Zap, 
  ArrowRight, 
  Star, 
  Target, 
  Brain, 
  Globe,
  Clock,
  Rocket,
  Chrome
} from "lucide-react";
import { motion } from "framer-motion";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = (location.state as any)?.from?.pathname as string | undefined;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    // Check initial auth state but don't force redirect
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    // Listen for auth state changes - only redirect when coming from a protected route
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (event === 'SIGNED_IN' && session && redirectPath) {
        navigate(redirectPath);
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
          redirectTo: `${window.location.origin}${redirectPath || '/auth'}`
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      authSchema.parse({ email, password });
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "default",
          });
          setIsSignUp(false); // Switch back to sign-in
          return;
        }
        throw error;
      }

      toast({
        title: "Success!",
        description: "Please check your email to confirm your account.",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign Up Failed",
          description: error.message || "An error occurred during sign up",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      authSchema.parse({ email, password });
      
      console.log('Attempting sign in with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }

      console.log('Sign in successful:', data);
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
      
      // Navigation will be handled by the auth state listener
    } catch (error: any) {
      console.error('Sign in failed:', error);
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign In Failed",
          description: error.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left Side - Landing Content */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-primary/5 via-accent/5 to-background relative overflow-hidden flex">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={fadeIn}
            className="space-y-8"
          >
            <div>
              <Badge className="mb-4 px-4 py-1" variant="secondary">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered Market Validation
              </Badge>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Validate your startup idea in 60 seconds
              </h1>
              <p className="text-lg text-muted-foreground">
                Stop guessing. Start building what people actually want. Get real market data instantly.
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-4">
              {[
                { icon: Brain, text: "AI-powered market analysis from millions of data points" },
                { icon: Globe, text: "Real-time social data from Reddit, Twitter & more" },
                { icon: Target, text: "Instant competitor analysis & market gaps" },
                { icon: Clock, text: "Get comprehensive results in under 60 seconds" }
              ].map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="space-y-4">
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="italic text-muted-foreground">
                "Saved us 3 months of market research. The AI insights were spot-on and helped us find product-market fit in weeks!"
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold">SC</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Sarah Chen</p>
                  <p className="text-xs text-muted-foreground">Founder, TechFlow</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom Stats */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-3 gap-6 pt-8 border-t border-border/50"
          >
            <div>
              <p className="text-2xl font-bold text-primary">10k+</p>
              <p className="text-sm text-muted-foreground">Ideas Validated</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">92%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">60s</p>
              <p className="text-sm text-muted-foreground">Avg. Time</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {isSignUp ? "Create an account" : "Welcome back"}
            </CardTitle>
            <CardDescription className="text-center">
              {isSignUp ? "Enter your email below to create your account" : "Enter your email to sign in to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || socialLoading !== null}
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
                  disabled={isLoading || socialLoading !== null}
                />
                <p className="text-xs text-muted-foreground h-4">
                  {isSignUp ? "Must be at least 6 characters" : ""}
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || socialLoading !== null}
              >
                {isLoading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Sign Up" : "Sign In")}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-primary hover:underline"
                  disabled={isLoading || socialLoading !== null}
                >
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up here"}
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleSocialSignIn('google')}
                disabled={socialLoading !== null || isLoading}
              >
                {socialLoading === 'google' ? (
                  "Connecting..."
                ) : (
                  <>
                    <Chrome className="mr-2 h-4 w-4" />
                    Google
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground h-5">
                {isSignUp ? "By signing up, you agree to our Terms of Service and Privacy Policy" : ""}
              </p>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}