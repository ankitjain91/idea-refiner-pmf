import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, UserPlus, Chrome, Shield, Check, Sparkles, Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { z } from "zod";

// Enhanced validation schema
const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
});


export default function EnterpriseAuth() {
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationErrors, setValidationErrors] = useState<z.ZodError | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if user is already authenticated (but don't redirect on landing page)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, []);

  // Check password strength
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors(null);
    
    try {
      // Validate input
      authSchema.parse({ email, password });
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            // Add any metadata you want
            signup_source: 'enterprise_auth'
          }
        }
      });

      if (error) {
        // Check if user already exists
        if (error.message?.toLowerCase().includes("user already registered") || 
            error.message?.toLowerCase().includes("already exists") ||
            error.code === "user_already_exists") {
          toast({
            title: "Account already exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
          // Optionally switch to sign in tab
          const tabElement = document.querySelector('[value="signin"]') as HTMLElement;
          if (tabElement) tabElement.click();
        } else {
          throw error;
        }
        return;
      }

      if (data?.user?.identities?.length === 0) {
        toast({
          title: "Account already exists",
          description: "This email is already registered. Please sign in instead.",
          variant: "destructive",
        });
        // Switch to sign in tab
        const tabElement = document.querySelector('[value="signin"]') as HTMLElement;
        if (tabElement) tabElement.click();
      } else {
        toast({
          title: "Success! 🎉",
          description: "Check your email for the confirmation link to activate your account.",
          className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
        });
        // Clear form
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationErrors(error);
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else if (error instanceof Error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors(null);
    
    try {
      // Basic validation for sign in (less strict)
      z.string().email().parse(email);
      if (password.length < 6) throw new Error("Password is required");
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Sync subscription role after successful login
      try {
        await supabase.functions.invoke('sync-subscription-role');
      } catch (syncError) {
        console.error('Failed to sync subscription role:', syncError);
      }

      
        // Navigate to home page after successful login
        navigate('/home');
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Sign In Error",
          description: error.message === "Invalid login credentials" 
            ? "Invalid email or password. Please try again."
            : error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google') => {
    setSocialLoading(provider);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      }
      setSocialLoading(null);
    }
  };

  const features = [
    { icon: Sparkles, text: "AI-powered market analysis" },
    { icon: Shield, text: "Real data from Reddit, Twitter & more" },
    { icon: Building2, text: "Instant competitor insights" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-accent/5 to-background p-12 flex-col justify-between">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-semibold">SmoothBrains</span>
          </Link>
          
          <div className="space-y-8 mt-20">
            <div>
              <h1 className="text-5xl font-bold mb-4">
                Validate Your Product
                <span className="gradient-text block mt-2">Before You Build</span>
              </h1>
      <p className="text-lg text-muted-foreground">
                Get instant AI analysis to validate your product-market fit before building.
              </p>
            </div>
            
            <div className="space-y-4">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          © 2024 SmoothBrains. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-card/95 backdrop-blur">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Get Started</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="font-medium">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11"
                      autoComplete="current-password"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-primary hover:opacity-90 font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4 mr-2" />
                    )}
                    Sign In
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialSignIn('google')}
                    disabled={socialLoading !== null}
                    className="w-full h-11 font-medium hover:bg-muted/50"
                  >
                    {socialLoading === 'google' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Chrome className="w-4 h-4 mr-2" />
                        Continue with Google
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Don't have an account?{" "}
                  <button
                    onClick={() => document.querySelector<HTMLButtonElement>('[value="signup"]')?.click()}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up for free
                  </button>
                </p>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className={cn(
                        "h-11",
                        validationErrors?.errors.find(e => e.path[0] === 'email') && "border-destructive"
                      )}
                      autoComplete="email"
                    />
                    {validationErrors?.errors.find(e => e.path[0] === 'email') && (
                      <p className="text-xs text-destructive">
                        {validationErrors.errors.find(e => e.path[0] === 'email')?.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Password (min 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className={cn(
                        "h-11",
                        validationErrors?.errors.find(e => e.path[0] === 'password') && "border-destructive"
                      )}
                      autoComplete="new-password"
                    />
                    {password && (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-1 flex-1 rounded-full transition-colors",
                                i < passwordStrength
                                  ? passwordStrength <= 2 ? "bg-destructive"
                                  : passwordStrength <= 3 ? "bg-warning"
                                  : "bg-success"
                                  : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {passwordStrength <= 2 ? "Weak" : passwordStrength <= 3 ? "Good" : "Strong"} password
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        By signing up, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-primary hover:opacity-90 font-medium"
                    disabled={loading || passwordStrength < 4}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Create Account
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
                  </div>
                </div>

                <div className="w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialSignIn('google')}
                    disabled={socialLoading !== null}
                    className="w-full h-11 font-medium hover:bg-muted/50"
                  >
                    {socialLoading === 'google' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Chrome className="w-4 h-4 mr-2" />
                        Continue with Google
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <button
                    onClick={() => document.querySelector<HTMLButtonElement>('[value="signin"]')?.click()}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}