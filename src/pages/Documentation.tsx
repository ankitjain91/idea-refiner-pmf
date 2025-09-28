import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, Shield, BarChart3, Clock, HelpCircle, Code, BookOpen, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Documentation = () => {
  const navigate = useNavigate();

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-foreground">Documentation & FAQ</h1>
          <p className="text-muted-foreground mt-2">Everything you need to know about Quantils Lab</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Overview Section */}
        <motion.section {...fadeInUp} className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Platform Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Quantils Lab is an AI-powered product-market fit validation platform that helps entrepreneurs and product managers validate their ideas using real market data and advanced analytics.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-secondary/10 rounded-lg">
                  <h4 className="font-semibold mb-2">Real-Time Analysis</h4>
                  <p className="text-sm text-muted-foreground">Get instant feedback on your ideas with our 60-second analysis engine.</p>
                </div>
                <div className="p-4 bg-secondary/10 rounded-lg">
                  <h4 className="font-semibold mb-2">Market Intelligence</h4>
                  <p className="text-sm text-muted-foreground">Access comprehensive market data from multiple sources.</p>
                </div>
                <div className="p-4 bg-secondary/10 rounded-lg">
                  <h4 className="font-semibold mb-2">Actionable Insights</h4>
                  <p className="text-sm text-muted-foreground">Receive specific recommendations to improve your product-market fit.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Methodology Section */}
        <motion.section {...fadeInUp} className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Our Methodology
              </CardTitle>
              <CardDescription>
                How we calculate product-market fit scores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Data Sources</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Market trend analysis from Google Trends, social media platforms, and industry reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Competitor analysis using public data and market intelligence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Consumer sentiment analysis from reviews, forums, and social media</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Financial projections based on industry benchmarks and growth patterns</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Accuracy Statement</h4>
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm">
                    Our algorithms achieve <strong>up to 85% accuracy</strong> based on internal benchmarks and validation against successful product launches. 
                    Results may vary based on data availability and market conditions.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Limitations</h4>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li>• Analysis is based on publicly available data only</li>
                  <li>• Results are estimates and should not be considered investment advice</li>
                  <li>• Market conditions can change rapidly</li>
                  <li>• Human judgment and expertise should complement our analysis</li>
                </ul>
              </div>

              <Button variant="outline" className="mt-4">
                <ExternalLink className="mr-2 h-4 w-4" />
                Download Full Methodology Paper
              </Button>
            </CardContent>
          </Card>
        </motion.section>

        {/* Features Section */}
        <motion.section {...fadeInUp} className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Analysis Tools</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Market Size Estimation</li>
                    <li>✓ Competitor Analysis</li>
                    <li>✓ Target Audience Profiling</li>
                    <li>✓ Revenue Projections</li>
                    <li>✓ Risk Assessment</li>
                    <li>✓ Growth Opportunity Identification</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Reporting & Export</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Detailed PDF Reports</li>
                    <li>✓ Interactive Dashboards</li>
                    <li>✓ Data Export (CSV/JSON)</li>
                    <li>✓ Executive Summaries</li>
                    <li>✓ Presentation-Ready Charts</li>
                    <li>✓ API Access (Enterprise)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* FAQ Section */}
        <motion.section {...fadeInUp} className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="trial">
                  <AccordionTrigger>What's included in the 7-day free trial?</AccordionTrigger>
                  <AccordionContent>
                    The free trial includes full access to all features: unlimited idea validations, market analysis, competitor research, 
                    and report generation. No credit card is required to start your trial. After 7 days, you can choose to continue 
                    with a paid plan or downgrade to our limited free tier (5 validations per month).
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data">
                  <AccordionTrigger>Where does your data come from?</AccordionTrigger>
                  <AccordionContent>
                    We aggregate data from multiple public sources including Google Trends, social media APIs, industry databases, 
                    government statistics, financial reports, and web scraping of public information. All data is processed through 
                    our proprietary algorithms to provide actionable insights.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="accuracy">
                  <AccordionTrigger>How accurate are your predictions?</AccordionTrigger>
                  <AccordionContent>
                    Our models achieve up to 85% accuracy based on internal benchmarks. We continuously validate our predictions 
                    against real-world outcomes and adjust our algorithms accordingly. However, no prediction system is perfect, 
                    and results should be used as one input among many in your decision-making process.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="privacy">
                  <AccordionTrigger>How do you handle my data and ideas?</AccordionTrigger>
                  <AccordionContent>
                    Your ideas and data are encrypted and stored securely. We never share your information with third parties 
                    without explicit consent. Ideas you validate remain your intellectual property. We use aggregated, anonymized 
                    data to improve our algorithms, but individual ideas are never exposed. See our Privacy Policy for full details.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="export">
                  <AccordionTrigger>Can I export my analysis results?</AccordionTrigger>
                  <AccordionContent>
                    Yes! All plans include PDF export of your analysis reports. Professional and Enterprise plans also include 
                    CSV data export, API access, and presentation-ready slides. You can also share reports via secure links 
                    with team members or investors.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="support">
                  <AccordionTrigger>What kind of support do you offer?</AccordionTrigger>
                  <AccordionContent>
                    Free tier users have access to our documentation and community forum. Paid plans include email support 
                    with 24-48 hour response time. Enterprise customers receive priority support with dedicated account managers 
                    and same-day response guarantees.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </motion.section>

        {/* Security Section */}
        <motion.section {...fadeInUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Data Security</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• 256-bit SSL encryption</li>
                    <li>• SOC 2 Type II certified</li>
                    <li>• GDPR compliant</li>
                    <li>• Regular security audits</li>
                    <li>• Secure AWS infrastructure</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Your Privacy</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Ideas remain your IP</li>
                    <li>• No data sharing without consent</li>
                    <li>• Right to deletion</li>
                    <li>• Transparent data practices</li>
                    <li>• Regular privacy reviews</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <Button variant="outline">
                  View Privacy Policy
                </Button>
                <Button variant="outline">
                  View Terms of Service
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Contact Section */}
        <motion.section {...fadeInUp} className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Need More Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button>
                  <BookOpen className="mr-2 h-4 w-4" />
                  View Full Documentation
                </Button>
                <Button variant="outline">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
};

export default Documentation;