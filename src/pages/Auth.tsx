import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, Zap, Loader2, CheckCircle, AlertCircle, Cpu, Bot, Rocket, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wrinkleCount, setWrinkleCount] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [emailValid, setEmailValid] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/home");
    }
  }, [user, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWrinkleCount(prev => (prev + Math.floor(Math.random() * 5) + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate password strength
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  }, [password]);

  useEffect(() => {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(emailRegex.test(email));
  }, [email]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.parse({ email, password });
      
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: validation.email,
        password: validation.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Check your email to confirm your account.",
      });
      
      console.log('[Auth] Sign up successful, navigating to /home');
      // Navigate to home page
      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.parse({ email, password });
      
      const { error } = await supabase.auth.signInWithPassword({
        email: validation.email,
        password: validation.password,
      });

      if (error) throw error;

      console.log('[Auth] Sign in successful, navigating to /home');
      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background animate-gradient" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary),0.02)_1px,transparent_1px)] bg-[size:50px_50px] animate-grid-move" />
      
      {/* Neural network connections */}
      <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="neural" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="50" cy="50" r="1" fill="currentColor" className="text-primary animate-pulse" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-primary/50" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-primary/50" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#neural)" />
      </svg>
      
      {/* Floating AI elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[Brain, Cpu, Bot, Sparkles, Zap].map((Icon, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${15 + i * 18}%`,
              top: `${5 + i * 15}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${20 + i * 3}s`,
              opacity: 0.1 + (i * 0.02),
            }}
          >
            <Icon className="w-16 h-16 text-primary" />
          </div>
        ))}
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative flex flex-col items-center justify-center min-h-screen p-4 z-10">
        {/* Header Branding */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-primary/30 rounded-full animate-pulse" />
            <div className="relative flex items-center justify-center gap-4 mb-6">
              <Brain className="w-16 h-16 text-primary animate-pulse drop-shadow-glow" />
              <h1 className="text-7xl font-orbitron font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/70 to-primary/50 drop-shadow-2xl animate-scale-in">
                SmoothBrains
              </h1>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <p className="text-sm font-mono tracking-widest text-primary/80 uppercase animate-fade-in" style={{ animationDelay: "0.2s" }}>
              GPT-4 Powered Intelligence
            </p>
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground/60 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <span className="px-2 py-1 rounded-full bg-primary/5 border border-primary/10">AI Neural Engine</span>
            <span className="px-2 py-1 rounded-full bg-primary/5 border border-primary/10">Machine Learning</span>
            <span className="px-2 py-1 rounded-full bg-primary/5 border border-primary/10">Deep Analysis</span>
            <span className="px-2 py-1 rounded-full bg-primary/5 border border-primary/10">Real-time Validation</span>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm animate-pulse">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-primary">Neural Activity: {wrinkleCount.toLocaleString()} wrinkles eliminated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="w-full max-w-4xl mb-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-2xl font-orbitron font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
            Choose Your Brain Smoothness Level
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all">
              <h3 className="font-bold text-lg mb-2">🧩 Smooth Starter</h3>
              <p className="text-2xl font-bold mb-2">$9<span className="text-sm text-muted-foreground">/mo</span></p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 100 brain smoothings/month</li>
                <li>• Basic wrinkle detection</li>
                <li>• Gentle brain massage</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg border-2 border-primary bg-primary/5 backdrop-blur-sm relative transform hover:scale-105 transition-all">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-semibold">
                SILKY SMOOTH
              </div>
              <h3 className="font-bold text-lg mb-2">🚀 Wrinkle Eraser</h3>
              <p className="text-2xl font-bold mb-2">$29<span className="text-sm text-muted-foreground">/mo</span></p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Unlimited brain polishing</li>
                <li>• Advanced wrinkle removal</li>
                <li>• Priority smoothing queue</li>
                <li>• Custom brain reports</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all">
              <h3 className="font-bold text-lg mb-2">🏆 Galaxy Brain</h3>
              <p className="text-2xl font-bold mb-2">$99<span className="text-sm text-muted-foreground">/mo</span></p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Everything in Wrinkle Eraser</li>
                <li>• Quantum brain smoothing</li>
                <li>• Personal brain butler</li>
                <li>• Direct neural API</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="w-full max-w-md border-primary/30 bg-card/80 backdrop-blur-md shadow-2xl shadow-primary/10 animate-scale-in relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          
          <Tabs defaultValue="signin" className="w-full relative">
            <TabsList className="grid w-full grid-cols-2 bg-background/50 backdrop-blur-sm">
              <TabsTrigger value="signin" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                <Rocket className="w-4 h-4 mr-2" />
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                <Brain className="w-4 h-4 mr-2" />
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="p-6">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-mono text-muted-foreground">Neural ID (Email)</Label>
                  <div className="relative">
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="brain@smoothbrains.ai"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsTyping(true);
                        setTimeout(() => setIsTyping(false), 500);
                      }}
                      required
                      disabled={loading}
                      className="pr-10 font-mono transition-all hover:border-primary/50 focus:border-primary"
                    />
                    {emailValid && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-scale-in" />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-mono text-muted-foreground">Access Code</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setIsTyping(true);
                        setTimeout(() => setIsTyping(false), 500);
                      }}
                      required
                      disabled={loading}
                      className="pr-10 font-mono transition-all hover:border-primary/50 focus:border-primary"
                    />
                    {password.length >= 6 && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-scale-in" />
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 font-orbitron font-bold tracking-wider bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="animate-pulse">Initializing Neural Link...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-5 w-5" />
                      Launch Neural Interface
                      <ChevronRight className="ml-2 h-4 w-4 animate-pulse" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="p-6">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-mono text-muted-foreground">Create Neural ID</Label>
                  <div className="relative">
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.brain@smoothbrains.ai"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsTyping(true);
                        setTimeout(() => setIsTyping(false), 500);
                      }}
                      required
                      disabled={loading}
                      className="pr-10 font-mono transition-all hover:border-primary/50 focus:border-primary"
                    />
                    {emailValid && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-scale-in" />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-mono text-muted-foreground">Set Access Code</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setIsTyping(true);
                        setTimeout(() => setIsTyping(false), 500);
                      }}
                      required
                      disabled={loading}
                      className="pr-10 font-mono transition-all hover:border-primary/50 focus:border-primary"
                    />
                    {password.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {password.length < 6 ? (
                          <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500 animate-scale-in" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="space-y-1 animate-fade-in">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono">Encryption Strength</span>
                        <span className="font-mono">{passwordStrength}%</span>
                      </div>
                      <div className="h-1 bg-background rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 font-orbitron font-bold tracking-wider bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5" 
                  disabled={loading || !emailValid || password.length < 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="animate-pulse">Creating Neural Pathways...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-5 w-5 animate-pulse" />
                      Initialize Brain
                      <ChevronRight className="ml-2 h-4 w-4 animate-pulse" />
                    </>
                  )}
                </Button>
                
                <div className="text-center space-y-2 mt-4">
                  <p className="text-xs text-muted-foreground/60 font-mono">
                    Join the neural network of innovators
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span className="text-primary animate-pulse">●</span>
                    <span className="text-muted-foreground">GPT-4 Integration Active</span>
                    <span className="text-primary animate-pulse">●</span>
                  </div>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center space-y-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3 animate-pulse" />
              <span className="font-mono">GPT-4 Turbo</span>
            </div>
            <div className="h-3 w-px bg-muted-foreground/20" />
            <div className="flex items-center gap-2">
              <Bot className="w-3 h-3 animate-pulse" />
              <span className="font-mono">Neural Processing</span>
            </div>
            <div className="h-3 w-px bg-muted-foreground/20" />
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 animate-pulse" />
              <span className="font-mono">Real-time Analysis</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground/40 font-mono">
            {isTyping ? "Neural activity detected..." : "System ready for neural interface"}
          </p>
        </div>
      </div>
    </div>
  );
}