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
  Layers
} from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const capabilitiesRef = useRef(null);
  const testimonialsRef = useRef(null);
  const pricingRef = useRef(null);
  
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

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
          emailRedirectTo: `${window.location.origin}/auth`,
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
      <div className="fixed inset-0 bg-[linear-gradient(rgba(100,150,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(100,150,255,0.01)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none" />
      
      {/* Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-primary/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-accent/10 to-transparent blur-3xl" />
      </div>

      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center px-4 py-20"
      >
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <Badge className="px-6 py-2 text-xs font-mono tracking-wider bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30 text-primary shadow-[0_0_20px_rgba(100,150,255,0.2)]">
              <Sparkles className="w-3 h-3 mr-2" />
              SMOOTHBRAINS NEURAL ENGINE v2.0
            </Badge>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-8xl font-display font-black mb-6 tracking-tight"
          >
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500">
              VALIDATE YOUR
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-accent mt-2">
              MILLION DOLLAR IDEA
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto font-light"
          >
            AI-powered market validation that analyzes millions of data points in real-time. 
            Stop building products nobody wants.
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

          {/* Quick Stats */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            <div className="text-center">
              <p className="text-3xl font-bold text-primary mb-1">10K+</p>
              <p className="text-sm text-gray-500 font-mono uppercase tracking-wider">Ideas Validated</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary mb-1">92%</p>
              <p className="text-sm text-gray-500 font-mono uppercase tracking-wider">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary mb-1">60s</p>
              <p className="text-sm text-gray-500 font-mono uppercase tracking-wider">Analysis Time</p>
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
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Scroll to explore</p>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronRight className="w-5 h-5 text-gray-500 rotate-90" />
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

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
                title: "Neural Analysis",
                description: "Deep learning models trained on 10M+ successful startups",
                gradient: "from-blue-500/20 to-purple-500/20"
              },
              {
                icon: Globe,
                title: "Real-Time Data",
                description: "Live market intelligence from Reddit, Twitter, and 100+ sources",
                gradient: "from-green-500/20 to-blue-500/20"
              },
              {
                icon: Target,
                title: "Precision Targeting",
                description: "Identify your exact market fit with 92% accuracy",
                gradient: "from-purple-500/20 to-pink-500/20"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <Card className="relative bg-gray-950/80 border-gray-800 hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(100,150,255,0.2)]">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section ref={featuresRef} className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
              KEY FEATURES
            </Badge>
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              Enterprise-Grade Intelligence
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {[
              {
                icon: BarChart3,
                title: "Market Size Calculator",
                description: "Get accurate TAM, SAM, and SOM calculations based on real data",
                stats: "99.2% Accuracy"
              },
              {
                icon: Users,
                title: "Competitor Analysis",
                description: "Deep dive into 50+ competitors with strengths and weaknesses",
                stats: "50+ Data Points"
              },
              {
                icon: MessageSquare,
                title: "Sentiment Analysis",
                description: "Real-time social media sentiment from millions of posts",
                stats: "10M+ Posts Daily"
              },
              {
                icon: LineChart,
                title: "Growth Projections",
                description: "AI-powered growth forecasts for the next 5 years",
                stats: "5 Year Forecast"
              },
              {
                icon: Shield,
                title: "Risk Assessment",
                description: "Identify potential challenges before they become problems",
                stats: "200+ Risk Factors"
              },
              {
                icon: Lightbulb,
                title: "Pivot Suggestions",
                description: "Get intelligent pivot recommendations when needed",
                stats: "AI-Powered"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="flex gap-6 p-6 rounded-2xl bg-gradient-to-r from-gray-900/50 to-gray-950/50 border border-gray-800 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(100,150,255,0.1)]"
              >
                <div className="shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                  <p className="text-gray-400 mb-3">{feature.description}</p>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {feature.stats}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="relative py-32 px-4 bg-gradient-to-b from-black via-gray-950/50 to-black">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
              TARGET USERS
            </Badge>
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              Built for Innovators
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Rocket, title: "Startup Founders", count: "2.5K+" },
              { icon: Briefcase, title: "Product Managers", count: "3.2K+" },
              { icon: Cpu, title: "Tech Entrepreneurs", count: "1.8K+" },
              { icon: Award, title: "VCs & Investors", count: "500+" }
            ].map((user, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="text-center p-8 rounded-2xl bg-gradient-to-b from-gray-900/30 to-gray-950/30 border border-gray-800 hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(100,150,255,0.2)]">
                  <user.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{user.title}</h3>
                <p className="text-2xl font-bold text-primary">{user.count}</p>
                <p className="text-xs text-gray-500 mt-1">Active Users</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsRef} className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
              SOCIAL PROOF
            </Badge>
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              Trusted by Founders
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "Founder, TechFlow",
                content: "Saved us 3 months of market research. The AI insights were spot-on!",
                rating: 5
              },
              {
                name: "Marcus Johnson",
                role: "CEO, DataPulse",
                content: "Found product-market fit in weeks instead of months. Game changer!",
                rating: 5
              },
              {
                name: "Emily Rodriguez",
                role: "Product Lead, NextGen",
                content: "The competitor analysis alone is worth 10x the price. Incredible tool!",
                rating: 5
              }
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="bg-gray-950/80 border-gray-800 hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{testimonial.name}</p>
                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section ref={pricingRef} className="relative py-32 px-4 bg-gradient-to-b from-black via-gray-950/50 to-black">
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
              Start Free, Scale Fast
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "Free",
                period: "forever",
                features: ["5 validations/month", "Basic analysis", "Email support"],
                cta: "Start Free",
                popular: false
              },
              {
                name: "Professional",
                price: "$49",
                period: "/month",
                features: ["Unlimited validations", "Advanced AI analysis", "Priority support", "API access"],
                cta: "Start Trial",
                popular: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "pricing",
                features: ["White label", "Custom models", "Dedicated support", "SLA guarantee"],
                cta: "Contact Sales",
                popular: false
              }
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0">
                      MOST POPULAR
                    </Badge>
                  </div>
                )}
                <Card className={`h-full ${plan.popular ? 'bg-gradient-to-b from-gray-900 to-gray-950 border-primary/30 shadow-[0_0_40px_rgba(100,150,255,0.2)]' : 'bg-gray-950/80 border-gray-800'} hover:border-primary/30 transition-all duration-300`}>
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl mb-4">{plan.name}</CardTitle>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-500">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-primary shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg' : ''}`}
                      variant={plan.popular ? "default" : "outline"}
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
                Ready to Validate Your Idea?
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Join thousands of successful founders who validated their ideas with Smoothbrains. 
                Start your free trial today.
              </p>
              <Button 
                size="lg" 
                className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-[0_0_50px_rgba(100,150,255,0.5)] hover:shadow-[0_0_70px_rgba(100,150,255,0.7)] transition-all duration-300"
                onClick={() => {
                  setIsSignUp(true);
                  setShowAuthModal(true);
                }}
              >
                Get Started Now
                <ArrowUpRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-gray-500 mt-6">No credit card required • 5 free validations</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sticky Bottom CTA */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none z-40"
      >
        <div className="max-w-7xl mx-auto flex justify-center pointer-events-auto">
          <Button 
            size="lg" 
            className="px-8 py-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-[0_0_40px_rgba(100,150,255,0.4)] hover:shadow-[0_0_60px_rgba(100,150,255,0.6)] transition-all duration-300"
            onClick={() => {
              setIsSignUp(true);
              setShowAuthModal(true);
            }}
          >
            <Rocket className="mr-2 h-5 w-5" />
            Get Started - It's Free
          </Button>
        </div>
      </motion.div>

      {/* Auth Modal */}
      {showAuthModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full max-w-md bg-gray-950/95 border-gray-800">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">
                  {isSignUp ? "Create your account" : "Welcome back"}
                </CardTitle>
                <CardDescription className="text-center">
                  {isSignUp ? "Start your free trial today" : "Sign in to continue"}
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