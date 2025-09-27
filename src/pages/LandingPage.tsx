import { useState, useEffect, useRef } from "react";
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
  Chrome,
  Shield,
  BarChart3,
  Users,
  Cpu,
  Database,
  GitBranch,
  Lock,
  ChevronRight,
  ArrowUpRight,
  MessageSquare,
  Briefcase,
  Award,
  Lightbulb,
  LineChart,
  PieChart,
  Activity,
  Gauge,
  Timer,
  Layers,
  Trophy,
  Sparkle,
  Flame,
  CheckCircle2,
  X
} from "lucide-react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Fun Wrinkle Points Counter Component
const WrinkleCounter = ({ points }: { points: number }) => {
  const displayPoints = useSpring(points, { stiffness: 100, damping: 30 });
  
  return (
    <motion.div 
      className="fixed top-6 right-6 z-50"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 1 }}
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-xl"
        />
        <div className="relative bg-black/90 border border-primary/30 rounded-2xl px-6 py-3 shadow-[0_0_30px_rgba(100,150,255,0.3)]">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
            >
              <Brain className="w-8 h-8 text-primary" />
            </motion.div>
            <div>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">Wrinkle Points</p>
              <motion.p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {Math.floor(displayPoints.get())}
              </motion.p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Achievement Badge Component
const AchievementBadge = ({ icon: Icon, title, description, unlocked, points }: any) => {
  return (
    <motion.div
      whileHover={{ scale: unlocked ? 1.05 : 1, y: unlocked ? -5 : 0 }}
      className={`relative p-4 rounded-xl border ${
        unlocked 
          ? 'bg-gradient-to-br from-gray-900/90 to-gray-950/90 border-primary/30 shadow-[0_0_20px_rgba(100,150,255,0.2)]' 
          : 'bg-gray-950/50 border-gray-800 opacity-50'
      }`}
    >
      {unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2"
        >
          <div className="bg-gradient-to-r from-primary to-accent rounded-full p-1">
            <Check className="w-3 h-3 text-black" />
          </div>
        </motion.div>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          unlocked ? 'bg-gradient-to-br from-primary/20 to-accent/20' : 'bg-gray-800'
        }`}>
          <Icon className={`w-5 h-5 ${unlocked ? 'text-primary' : 'text-gray-600'}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm mb-1">{title}</h4>
          <p className="text-xs text-gray-400">{description}</p>
          <div className="flex items-center gap-1 mt-2">
            <Sparkle className="w-3 h-3 text-primary" />
            <span className="text-xs font-mono text-primary">+{points} WP</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Progress Bar Component
const BrainProgressBar = ({ level, progress }: { level: number; progress: number }) => {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
            Level {level}
          </Badge>
          <span className="text-xs text-gray-400 font-mono">SMOOTHBRAIN → WRINKLEBRAIN</span>
        </div>
        <span className="text-sm font-bold text-primary">{progress}%</span>
      </div>
      <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary via-primary/80 to-accent relative"
        >
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        </motion.div>
      </div>
    </div>
  );
};

// Typewriter effect hook
const useTypewriter = (text: string, speed: number = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayText, isTyping };
};

// Floating animation component
const FloatingElement = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  return (
    <motion.div
      animate={{
        y: [0, -20, 0],
        rotate: [0, 5, -5, 0],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        delay,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
};

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
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(shouldOpenAuthModal || false);
  
  // Gamification States
  const [wrinklePoints, setWrinklePoints] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [smoothbrainScore, setSmoothbrainScore] = useState(100);
  
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const capabilitiesRef = useRef(null);
  const testimonialsRef = useRef(null);
  const pricingRef = useRef(null);
  
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  
  // Typewriter effect for tagline
  const tagline = "Neural Validation Engine";
  const { displayText: typewriterText, isTyping } = useTypewriter(tagline, 100);

  // Mouse parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (clientX - left - width / 2) / width;
    const y = (clientY - top - height / 2) / height;
    mouseX.set(x);
    mouseY.set(y);
  };
  
  const backgroundX = useTransform(mouseX, [-1, 1], [-30, 30]);
  const backgroundY = useTransform(mouseY, [-1, 1], [-30, 30]);

  // Fun scroll-based wrinkle point accumulation
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      const scrollPercentage = Math.floor(latest * 100);
      setWrinklePoints(prev => {
        const newPoints = scrollPercentage * 5;
        if (newPoints > prev) {
          // Level up every 500 points
          if (newPoints >= 500 && prev < 500) {
            setUserLevel(2);
            toast({
              title: "🎉 Level Up!",
              description: "You're now a Level 2 Thinker!",
            });
          }
          if (newPoints >= 1000 && prev < 1000) {
            setUserLevel(3);
            toast({
              title: "🚀 Level Up!",
              description: "Level 3 - Getting those wrinkles!",
            });
          }
          if (newPoints >= 2000 && prev < 2000) {
            setUserLevel(4);
            toast({
              title: "🧠 Level Up!",
              description: "Level 4 - Big Brain Time!",
            });
          }
          
          // Unlock achievements
          if (newPoints >= 100 && !achievements.includes("first_scroll")) {
            setAchievements(prev => [...prev, "first_scroll"]);
            toast({
              title: "🧠 Achievement Unlocked!",
              description: "First Wrinkle - You're getting smarter!",
            });
          }
          if (newPoints >= 500 && !achievements.includes("halfway")) {
            setAchievements(prev => [...prev, "halfway"]);
            toast({
              title: "🎯 Achievement Unlocked!",
              description: "Halfway to Genius - Keep scrolling!",
            });
          }
        }
        return newPoints > prev ? newPoints : prev;
      });
      setSmoothbrainScore(Math.max(0, 100 - scrollPercentage));
    });
    
    return () => unsubscribe();
  }, [scrollYProgress, achievements, toast]);

  // Open auth modal if navigated from logout
  useEffect(() => {
    if (shouldOpenAuthModal) {
      setShowAuthModal(true);
      setIsSignUp(false); // Default to sign in after logout
      // Clear the state to prevent modal from reopening on refresh
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      authSchema.parse({ email, password });
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedEmail !== 'er.ankitjain91@gmail.com') {
        toast({
          title: "Access Restricted",
          description: "Signups are currently limited to invited users only.",
          variant: "destructive",
        });
        return;
      }

      const { data: emailExists, error: checkError } = await supabase.rpc('check_email_exists', {
        email_to_check: normalizedEmail,
      });

      if (checkError) {
        toast({
          title: "Could not verify email",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      if (emailExists === true) {
        toast({
          title: "Account exists",
          description: "This email is already registered. Please sign in.",
          variant: "default",
        });
        setIsSignUp(false);
        return;
      }

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setShowAuthModal(false);
    } catch (error: any) {
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

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8 }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Futuristic Grid Background */}
      
      {/* Animated Background Layers */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Futuristic Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(100,150,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(100,150,255,0.01)_1px,transparent_1px)] bg-[size:100px_100px]" />
        
        {/* Animated Gradient Orbs */}
        <motion.div 
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-primary/20 to-transparent blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div 
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-accent/20 to-transparent blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 100,
              }}
              animate={{
                y: -100,
                x: Math.random() * window.innerWidth,
              }}
              transition={{
                duration: Math.random() * 20 + 10,
                repeat: Infinity,
                delay: Math.random() * 10,
                ease: "linear"
              }}
            />
          ))}
        </div>
      </div>

      {/* Company Name Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-b border-primary/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Empty left side for balance */}
          <div className="flex-1">
          </div>

          {/* Centered Logo */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/20 blur-xl" />
              <Brain className="w-12 h-12 text-primary relative" />
            </motion.div>
            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-2">
                <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-accent tracking-tight">
                  SmoothBrains
                </h1>
                <span className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">
                  beta
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mt-1">
                {typewriterText}
                {isTyping && <span className="animate-pulse">|</span>}
              </p>
            </div>
          </div>

          {/* Empty right side for balance */}
          <div className="flex-1">
          </div>
        </div>
      </motion.div>

      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center px-4 py-20 pt-32"
        onMouseMove={handleMouseMove}
      >
        {/* Parallax Background Elements */}
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          style={{ x: backgroundX, y: backgroundY }}
        >
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
        </motion.div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <motion.div
              animate={{
                opacity: [0.7, 1, 0.7],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Badge className="px-6 py-2 text-xs font-mono tracking-wider bg-gradient-to-r from-primary/15 to-accent/15 border-primary/25 text-primary/90 backdrop-blur-sm shadow-[0_0_20px_rgba(100,150,255,0.1)]">
                <Sparkles className="w-3 h-3 mr-2 opacity-70" />
                SMOOTHBRAINS NEURAL ENGINE v2.0
              </Badge>
            </motion.div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-8xl font-display font-black mb-6 tracking-tight"
          >
            <motion.span 
              className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              VALIDATE YOUR
            </motion.span>
            <motion.span 
              className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-accent mt-2"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              MILLION DOLLAR IDEA
            </motion.span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto font-light"
          >
            Powered by real market data. Trusted by smart founders. Built for serious entrepreneurs.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Button 
              size="lg" 
              className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_40px_rgba(100,150,255,0.4)] hover:shadow-[0_0_60px_rgba(100,150,255,0.6)] transition-all duration-300 border border-primary/30"
              onClick={() => {
                setIsSignUp(true);
                setShowAuthModal(true);
                setWrinklePoints(prev => prev + 50);
                toast({
                  title: "🧠 +50 Wrinkle Points!",
                  description: "Smart move! You're getting wrinklier!",
                });
              }}
            >
              <Rocket className="mr-2 h-5 w-5" />
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 py-6 text-lg font-semibold border-gray-700 hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_30px_rgba(100,150,255,0.2)] transition-all duration-300"
              onClick={() => {
                setIsSignUp(false);
                setShowAuthModal(true);
              }}
            >
              <Lock className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          </motion.div>

          {/* Quick Stats with Gamification */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            <div className="text-center">
              <p className="text-3xl font-bold text-primary mb-1">Est. 2024</p>
              <p className="text-sm text-gray-500 font-mono uppercase tracking-wider">Platform Launch</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary mb-1">{smoothbrainScore}%</p>
              <p className="text-sm text-gray-500 font-mono uppercase tracking-wider">Algorithm Accuracy†</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary mb-1">~60s</p>
              <p className="text-sm text-gray-500 font-mono uppercase tracking-wider">Avg. Analysis Time</p>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Scroll to gain wrinkles</p>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronRight className="w-5 h-5 text-gray-500 rotate-90" />
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* Gamification Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
              🧠 BRAIN METRICS
            </Badge>
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              Your Wrinkle Journey
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
              Track your progress from Smoothbrain to Wrinklebrain. Each validation adds wrinkles!
            </p>
            
            {/* Progress Bar */}
            <div className="max-w-2xl mx-auto mb-16">
              <BrainProgressBar level={userLevel} progress={Math.min(100, (wrinklePoints / 20))} />
            </div>
          </motion.div>

          {/* Achievements Grid */}
          <div className="grid md:grid-cols-4 gap-6">
            <AchievementBadge 
              icon={Brain} 
              title="First Wrinkle" 
              description="Scroll the landing page" 
              unlocked={achievements.includes("first_scroll")}
              points={100}
            />
            <AchievementBadge 
              icon={Trophy} 
              title="Halfway Genius" 
              description="Reach 500 wrinkle points" 
              unlocked={achievements.includes("halfway")}
              points={500}
            />
            <AchievementBadge 
              icon={Flame} 
              title="On Fire" 
              description="Validate 5 ideas" 
              unlocked={false}
              points={1000}
            />
            <AchievementBadge 
              icon={Award} 
              title="Big Brain" 
              description="Reach Level 10" 
              unlocked={false}
              points={5000}
            />
          </div>
        </div>
      </section>

      {/* What It Does Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
              WHAT WE DO
            </Badge>
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              AI That Thinks Like a VC
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our neural engine analyzes market trends, competitor data, and consumer sentiment 
              to give you venture-capital grade insights instantly.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "Wrinkle Score™ System",
                description: "More wrinkles = Higher profit potential. Our AI adds wrinkles as it discovers revenue opportunities.",
                gradient: "from-blue-500/20 to-purple-500/20",
                badge: "🧠 +500 wrinkles/analysis"
              },
              {
                icon: Globe,
                title: "Real-Time Data Mining",
                description: "Each data point adds wrinkles. More market validation = More brain wrinkles = Better profit signals.",
                gradient: "from-green-500/20 to-blue-500/20",
                badge: "📊 +100 wrinkles/source"
              },
              {
                icon: Target,
                title: "Profit Calibration",
                description: "1000+ wrinkles = Ready to launch. 5000+ wrinkles = VC-ready. 10000+ = Unicorn potential.",
                gradient: "from-purple-500/20 to-pink-500/20",
                badge: "🎯 Wrinkle-to-profit ratio"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 10,
                  z: 50
                }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="relative group transform-gpu"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse`} />
                <Card className="relative bg-gray-950/80 border-gray-800 hover:border-primary/30 transition-all duration-300 backdrop-blur-xl hover:shadow-[0_30px_60px_rgba(100,150,255,0.4)] h-full">
                  <CardContent className="p-8 h-full flex flex-col">
                    <FloatingElement delay={idx * 0.5}>
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(100,150,255,0.2)]">
                        <feature.icon className="w-7 h-7 text-primary" />
                      </div>
                    </FloatingElement>
                    <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
                    {feature.badge && (
                      <Badge className="mb-3 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                        {feature.badge}
                      </Badge>
                    )}
                    <p className="text-gray-400 leading-relaxed flex-1">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
              PRICING
            </Badge>
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              Choose Your Brain Smoothness Level
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              From casual smoothbrain to galaxy brain, we've got a plan that fits your neural evolution journey.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Smooth Starter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ 
                y: -10,
                rotateX: 5,
                rotateY: -5,
              }}
              transition={{ duration: 0.6 }}
              className="relative transform-gpu perspective-1000"
              style={{ transformStyle: "preserve-3d" }}
            >
              <Card className="relative bg-gray-950/80 border-gray-800 hover:border-primary/30 transition-all duration-300 h-full backdrop-blur-xl hover:shadow-[0_20px_60px_rgba(100,150,255,0.3)]">
                <CardHeader className="pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">🧩 Smooth Starter</h3>
                    <Badge variant="secondary">Basic</Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-primary">$9</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">5 analyses per month</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Public data insights</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Educational resources</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Community support</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-6" 
                    variant="outline"
                    onClick={() => {
                      setIsSignUp(true);
                      setShowAuthModal(true);
                    }}
                  >
                    Start Smoothing
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Wrinkle Eraser - Most Popular */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 px-4 py-1">
                  MOST POPULAR
                </Badge>
              </div>
              <Card className="relative bg-gradient-to-b from-primary/10 to-gray-950/80 border-primary/50 hover:border-primary transition-all duration-300 h-full transform hover:scale-105">
                <CardHeader className="pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">🚀 Wrinkle Eraser</h3>
                    <Badge className="bg-primary/20 text-primary border-primary/30">Pro</Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-primary">$29</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Unlimited analyses</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Advanced market research</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Priority processing</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Detailed reports (PDF)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Email & chat support</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_0_20px_rgba(100,150,255,0.4)]" 
                    onClick={() => {
                      setIsSignUp(true);
                      setShowAuthModal(true);
                    }}
                  >
                    Go Pro
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Galaxy Brain */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <Card className="relative bg-gray-950/80 border-gray-800 hover:border-primary/30 transition-all duration-300 h-full">
                <CardHeader className="pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">🏆 Galaxy Brain</h3>
                    <Badge variant="secondary">Enterprise</Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-primary">$99</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Everything in Pro</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Custom data sources</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Dedicated account manager</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">API access (rate limited)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">Team collaboration tools</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-6" 
                    variant="outline"
                    onClick={() => {
                      setIsSignUp(true);
                      setShowAuthModal(true);
                    }}
                  >
                    Contact Sales
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center mt-12"
          >
            <p className="text-gray-500">
              All plans include a 7-day free trial. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl" />
            <div className="relative bg-gradient-to-b from-gray-900/90 to-gray-950/90 rounded-3xl p-12 border border-primary/30 shadow-[0_0_60px_rgba(100,150,255,0.3)]">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
                Ready to Gain Some Wrinkles?
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Join thousands of successful founders who evolved from Smoothbrains to Wrinklebrains. 
                Start your neural evolution today!
              </p>
              <Button 
                size="lg" 
                className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-[0_0_50px_rgba(100,150,255,0.5)] hover:shadow-[0_0_70px_rgba(100,150,255,0.7)] transition-all duration-300"
                onClick={() => {
                  setIsSignUp(true);
                  setShowAuthModal(true);
                  setWrinklePoints(prev => prev + 100);
                  toast({
                    title: "🚀 +100 Wrinkle Points!",
                    description: "You're evolving rapidly!",
                  });
                }}
              >
                Get Started Now
                <ArrowUpRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-gray-500 mt-6">No credit card required • 5 free validations • Instant wrinkles</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Legal Disclaimer Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-gray-500 mb-4">
            * This platform provides educational analysis tools based on publicly available data. Results are algorithmic estimates and should not be considered professional advice.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            † Accuracy metrics are based on internal testing and may vary. Past performance does not guarantee future results.
          </p>
          <p className="text-xs text-gray-500">
            By using this platform, you acknowledge that all analyses are for informational purposes only. We are not responsible for business decisions made based on our tools.
            Please consult with qualified professionals for investment, legal, or business advice. Terms of Service and Privacy Policy apply.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* Close button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute -top-2 -right-2 z-10 bg-gray-900/90 hover:bg-gray-800/90 border border-gray-700 rounded-full p-2 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
            
            <Card className="w-full max-w-md bg-gray-950/95 border-gray-800">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">
                  {isSignUp ? "Join the Wrinkle Revolution" : "Welcome back, Thinker"}
                </CardTitle>
                <CardDescription className="text-center">
                  {isSignUp ? "Start your journey to big brain status" : "Continue gaining those wrinkles"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading || socialLoading !== null}
                      className="bg-gray-900/50 border-gray-800 focus:border-primary/50"
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
                      className="bg-gray-900/50 border-gray-800 focus:border-primary/50"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary/80" 
                    disabled={isLoading || socialLoading !== null}
                  >
                    {isLoading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-sm text-primary hover:underline"
                      disabled={isLoading || socialLoading !== null}
                    >
                      {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="px-2 bg-gray-950 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-gray-800 hover:border-primary/50"
                    onClick={() => handleSocialSignIn('google')}
                    disabled={socialLoading !== null || isLoading}
                  >
                    {socialLoading === 'google' ? (
                      "Connecting..."
                    ) : (
                      <>
                        <Chrome className="mr-2 h-4 w-4" />
                        Continue with Google
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}