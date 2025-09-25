import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, Shield, TrendingUp, Users, Zap, ArrowRight, ChevronRight, Play, MessageSquare, Star, Building2, Rocket, Target, Brain, BarChart, Globe, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, []);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Notification Bar for Authenticated Users */}
      {isAuthenticated && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <p className="text-sm text-foreground">You're already signed in!</p>
            <Button onClick={() => navigate('/dashboard')} size="sm" className="gap-2">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-background pt-20 pb-32">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <motion.div 
          className="container mx-auto px-4 relative z-10"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div variants={fadeIn} className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 px-4 py-1" variant="secondary">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered Market Validation
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              Validate your startup idea with AI-powered insights
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Stop guessing. Start building what people actually want. Get real market data in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/signin')}
                className="gap-2 text-lg px-8 shadow-lg hover:shadow-xl transition-all hover-scale"
              >
                Start Free <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="gap-2 text-lg px-8"
              >
                <Play className="w-5 h-5" /> Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Animated Visual */}
          <motion.div 
            variants={fadeIn}
            className="mt-16 relative max-w-5xl mx-auto"
          >
            <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 p-1">
              <div className="rounded-lg bg-background/95 backdrop-blur w-full h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <BarChart className="w-20 h-20 text-primary mx-auto mb-4 animate-pulse" />
                  <p className="text-lg text-muted-foreground">Dashboard Demo Coming Soon</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Social Proof */}
      <section className="py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <p className="text-muted-foreground">Trusted by innovators at</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60 hover:opacity-100 transition-opacity">
            {['TechStars', 'Y Combinator', 'Google for Startups', '500 Startups', 'Plug and Play'].map((name) => (
              <div key={name} className="text-lg font-semibold text-muted-foreground hover:text-foreground transition-colors">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {[
              {
                name: "Sarah Chen",
                role: "Founder, TechFlow",
                quote: "Saved us 3 months of market research. The AI insights were spot-on!",
                rating: 5
              },
              {
                name: "Michael Roberts",
                role: "CEO, DataDrive",
                quote: "Found product-market fit in weeks, not months. Game-changing tool.",
                rating: 5
              },
              {
                name: "Emily Johnson",
                role: "Product Lead, InnovateCo",
                quote: "The competitor analysis alone is worth 10x the price. Incredible value!",
                rating: 5
              }
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Everything you need to validate fast</h2>
            <p className="text-xl text-muted-foreground">Real data. Real insights. Real fast.</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Brain,
                title: "AI Market Analysis",
                description: "GPT-4 powered insights from millions of data points"
              },
              {
                icon: Globe,
                title: "Real Social Data",
                description: "Live data from Reddit, Twitter, and trending platforms"
              },
              {
                icon: Target,
                title: "Competitor Intelligence",
                description: "Instant analysis of your competition's strengths & gaps"
              },
              {
                icon: TrendingUp,
                title: "PMF Score",
                description: "Quantified product-market fit score with actionable insights"
              },
              {
                icon: Clock,
                title: "60-Second Results",
                description: "Get comprehensive analysis in under a minute"
              },
              {
                icon: Rocket,
                title: "Action Roadmap",
                description: "Clear next steps to improve your product-market fit"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Three simple steps to validation</p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Connection Line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 hidden md:block" />
              
              <div className="grid md:grid-cols-3 gap-8 relative">
                {[
                  {
                    step: "1",
                    title: "Enter your idea",
                    description: "Describe your product or paste your landing page",
                    icon: Sparkles
                  },
                  {
                    step: "2",
                    title: "AI analyzes signals",
                    description: "Our AI scans millions of data points across platforms",
                    icon: Brain
                  },
                  {
                    step: "3",
                    title: "Get action plan",
                    description: "Receive your PMF score and improvement roadmap",
                    icon: Target
                  }
                ].map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.2 }}
                    className="relative"
                  >
                    <div className="bg-background rounded-xl p-6 text-center relative z-10">
                      <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                        {step.step}
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </div>
                    {idx < 2 && (
                      <ChevronRight className="hidden md:block absolute top-1/2 -right-4 w-8 h-8 text-muted-foreground -translate-y-1/2 z-20" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-muted-foreground">Start free, upgrade when you're ready</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                description: "Perfect for testing ideas",
                features: ["3 validations/month", "Basic AI analysis", "PMF score", "Email support"],
                cta: "Try Free",
                variant: "outline" as const
              },
              {
                name: "Pro",
                price: "$29",
                description: "For serious founders",
                features: ["Unlimited validations", "Advanced AI insights", "Competitor tracking", "Priority support", "Custom reports"],
                cta: "Start Pro Trial",
                variant: "default" as const,
                popular: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                description: "For teams & agencies",
                features: ["Everything in Pro", "API access", "Team collaboration", "White-label options", "Dedicated support"],
                cta: "Contact Sales",
                variant: "outline" as const
              }
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1">
                    Most Popular
                  </Badge>
                )}
                <Card className={cn(
                  "h-full",
                  plan.popular && "border-primary shadow-lg"
                )}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={plan.variant}
                      onClick={() => navigate('/signin')}
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

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {[
                {
                  question: "How accurate is the AI analysis?",
                  answer: "Our AI analyzes millions of real data points from social media, search trends, and market data. While no prediction is 100% accurate, our users report 85%+ alignment with their actual market experience."
                },
                {
                  question: "What data sources do you use?",
                  answer: "We aggregate data from Reddit, Twitter, Google Trends, Product Hunt, industry reports, and over 20+ other sources to give you comprehensive market insights."
                },
                {
                  question: "Can I validate multiple ideas?",
                  answer: "Yes! Free users get 3 validations per month. Pro users get unlimited validations and can track multiple ideas simultaneously."
                },
                {
                  question: "How long does analysis take?",
                  answer: "Most analyses complete in under 60 seconds. Complex ideas with multiple market segments may take up to 2 minutes."
                },
                {
                  question: "Do you offer refunds?",
                  answer: "Yes, we offer a 14-day money-back guarantee if you're not satisfied with the Pro plan."
                }
              ].map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Live Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          size="lg" 
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all hover-scale"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>

      {/* Footer */}
      <footer className="bg-primary/5 border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-semibold">PMF Validator</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Validate your startup ideas with AI-powered market insights.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Case Studies</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Stay Updated</h4>
              <p className="text-sm text-muted-foreground mb-3">Get weekly insights on product-market fit</p>
              <div className="flex gap-2">
                <Input 
                  placeholder="Your email" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button>Subscribe</Button>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 PMF Validator. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}