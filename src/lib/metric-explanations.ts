// Metric explanations for different dashboard tiles
export const metricExplanations = {
  // Market Size Metrics
  tam: {
    definition: "Total Addressable Market - The total revenue opportunity available if 100% market share was achieved",
    calculation: "Sum of all potential customers × Average revenue per customer",
    usefulness: "Shows the maximum market opportunity and helps validate if the market is large enough to pursue",
    benchmarks: "Good TAM: $1B+, Great TAM: $10B+, Exceptional: $100B+",
    tips: [
      "Look for growing TAMs (10%+ yearly growth)",
      "Consider if you can expand TAM with new use cases",
      "Compare TAM across different geographies"
    ]
  },
  sam: {
    definition: "Serviceable Addressable Market - The portion of TAM you can realistically target with your business model",
    calculation: "TAM × % of market you can serve (based on geography, features, pricing)",
    usefulness: "Provides a realistic view of your actual market opportunity given constraints",
    benchmarks: "Typically 10-40% of TAM depending on focus",
    tips: [
      "SAM can grow as you add features or expand geographically",
      "Focus on SAM with highest willingness to pay",
      "Consider regulatory constraints in SAM calculation"
    ]
  },
  som: {
    definition: "Serviceable Obtainable Market - The realistic portion of SAM you can capture in 3-5 years",
    calculation: "SAM × Realistic market share % (1-10% for new entrants)",
    usefulness: "Sets realistic revenue targets and helps with financial planning",
    benchmarks: "1-5% of SAM for year 1, 5-15% by year 3",
    tips: [
      "Be conservative - most startups overestimate SOM",
      "Factor in competition and switching costs",
      "SOM should align with your go-to-market strategy"
    ]
  },

  // Competition Metrics
  competition_level: {
    definition: "The intensity of competition in your market based on number and strength of competitors",
    calculation: "Weighted score of (Direct competitors × 2) + (Indirect × 1) + (Market concentration factor)",
    usefulness: "Helps assess market entry difficulty and differentiation requirements",
    benchmarks: "Low: <5 competitors, Medium: 5-15, High: 15+",
    tips: [
      "High competition can validate market demand",
      "Look for underserved niches in competitive markets",
      "Consider barriers to entry beyond just competitor count"
    ]
  },
  market_share: {
    definition: "The percentage of total market revenue or customers you control",
    calculation: "(Your revenue / Total market revenue) × 100",
    usefulness: "Tracks competitive position and growth relative to market",
    benchmarks: "Leader: >30%, Strong: 10-30%, Emerging: <10%",
    tips: [
      "Focus on share of growth, not just current share",
      "Small share in large market > large share in small market",
      "Track share by segment for better insights"
    ]
  },

  // Growth Metrics
  growth_rate: {
    definition: "The percentage increase in a metric (revenue, users, etc.) over a time period",
    calculation: "((Current Value - Previous Value) / Previous Value) × 100",
    usefulness: "Indicates business momentum and market traction",
    benchmarks: "Good: 20%+ monthly, Great: 50%+, Hypergrowth: 100%+",
    tips: [
      "Consistency matters more than absolute rate",
      "Compare to industry growth rates",
      "Watch for sustainable vs. unsustainable growth"
    ]
  },
  cagr: {
    definition: "Compound Annual Growth Rate - The smoothed annual growth rate over multiple years",
    calculation: "((Ending Value / Beginning Value)^(1/Years)) - 1",
    usefulness: "Provides normalized growth metric for comparison across different time periods",
    benchmarks: "Market CAGR: 5-15%, Good startup: 50%+, Exceptional: 100%+",
    tips: [
      "Use 3-5 year CAGR for stability",
      "Compare to market CAGR for relative performance",
      "Factor in market maturity when setting targets"
    ]
  },

  // Customer Metrics
  acquisition_cost: {
    definition: "Customer Acquisition Cost (CAC) - Total cost to acquire one new customer",
    calculation: "Total Sales & Marketing Costs / Number of New Customers",
    usefulness: "Determines profitability and scalability of growth",
    benchmarks: "Should be <33% of customer lifetime value",
    tips: [
      "Include all costs: ads, salaries, tools, etc.",
      "Track CAC by channel for optimization",
      "CAC should decrease with scale"
    ]
  },
  ltv: {
    definition: "Customer Lifetime Value - Total revenue expected from a customer relationship",
    calculation: "Average Revenue per User × Customer Lifetime (months) × Gross Margin",
    usefulness: "Determines how much you can spend to acquire customers profitably",
    benchmarks: "LTV:CAC ratio should be >3:1",
    tips: [
      "Increase LTV through upsells and retention",
      "Segment LTV by customer type",
      "Consider time value of money for long-term LTV"
    ]
  },
  churn_rate: {
    definition: "The percentage of customers who stop using your product in a given period",
    calculation: "(Customers lost in period / Total customers at start) × 100",
    usefulness: "Indicates product-market fit and customer satisfaction",
    benchmarks: "B2C: <5% monthly, B2B: <2% monthly, Enterprise: <1%",
    tips: [
      "Track both customer and revenue churn",
      "Identify churn reasons through exit surveys",
      "Negative churn (expansion > losses) is the goal"
    ]
  },

  // Financial Metrics
  burn_rate: {
    definition: "The rate at which a company spends cash to operate before generating positive cash flow",
    calculation: "Total Monthly Operating Expenses - Monthly Revenue",
    usefulness: "Determines runway and funding needs",
    benchmarks: "Should provide 12-18 months runway",
    tips: [
      "Track gross burn (total spend) and net burn (after revenue)",
      "Plan for 6 months buffer beyond expected funding",
      "Reduce burn by extending payment terms"
    ]
  },
  runway: {
    definition: "How long a company can operate before running out of cash",
    calculation: "Current Cash Balance / Monthly Burn Rate",
    usefulness: "Critical for planning fundraising and growth initiatives",
    benchmarks: "Minimum: 6 months, Comfortable: 12-18 months",
    tips: [
      "Always have a Plan B if funding is delayed",
      "Track best/expected/worst case scenarios",
      "Consider revenue growth in runway calculations"
    ]
  },
  gross_margin: {
    definition: "The percentage of revenue retained after direct costs",
    calculation: "((Revenue - Cost of Goods Sold) / Revenue) × 100",
    usefulness: "Indicates business model efficiency and pricing power",
    benchmarks: "SaaS: 70-85%, Marketplace: 20-40%, Hardware: 20-40%",
    tips: [
      "Higher margins = more to invest in growth",
      "Track margin improvement over time",
      "Consider unit economics at scale"
    ]
  },

  // Engagement Metrics
  dau_mau: {
    definition: "Daily Active Users / Monthly Active Users ratio - measures stickiness",
    calculation: "Average Daily Active Users / Monthly Active Users",
    usefulness: "Indicates how frequently users engage with your product",
    benchmarks: "Social: 50%+, SaaS: 10-20%, E-commerce: 5-10%",
    tips: [
      "Higher ratio = more habitual usage",
      "Track by user segment for insights",
      "Consider natural usage frequency for your product"
    ]
  },
  retention_rate: {
    definition: "Percentage of users who continue using the product after initial period",
    calculation: "(Users retained / Initial users) × 100",
    usefulness: "Best indicator of product-market fit",
    benchmarks: "Day 1: 70%+, Day 7: 40%+, Day 30: 20%+",
    tips: [
      "Focus on activation before retention",
      "Cohort analysis reveals retention patterns",
      "Improving early retention impacts all metrics"
    ]
  },
  nps: {
    definition: "Net Promoter Score - Likelihood of users recommending your product",
    calculation: "% Promoters (9-10) - % Detractors (0-6)",
    usefulness: "Predicts growth through word-of-mouth and customer loyalty",
    benchmarks: "Excellent: 70+, Great: 50+, Good: 30+",
    tips: [
      "Follow up with detractors to understand issues",
      "Track NPS trends more than absolute scores",
      "Segment NPS by customer type or feature usage"
    ]
  },

  // Market Trend Metrics
  search_volume: {
    definition: "Number of searches for related keywords in search engines",
    calculation: "Sum of monthly searches across relevant keywords",
    usefulness: "Indicates market interest and demand trends",
    benchmarks: "Growing: 10%+ MoM, Stable: ±5%, Declining: -10%",
    tips: [
      "Track branded vs. non-branded searches",
      "Monitor competitor search volumes",
      "Seasonal patterns affect interpretation"
    ]
  },
  sentiment_score: {
    definition: "Aggregate measure of positive vs negative mentions online",
    calculation: "(Positive mentions - Negative mentions) / Total mentions",
    usefulness: "Gauges market perception and brand health",
    benchmarks: "Positive: >0.6, Neutral: 0.4-0.6, Negative: <0.4",
    tips: [
      "Weight by source influence",
      "Track sentiment changes during launches",
      "Address negative sentiment quickly"
    ]
  },
  virality_coefficient: {
    definition: "Average number of new users each existing user brings",
    calculation: "Invites sent per user × Conversion rate of invites",
    usefulness: "Determines organic growth potential",
    benchmarks: "Viral: >1.0, Strong: 0.5-1.0, Moderate: <0.5",
    tips: [
      "K>1 means exponential growth",
      "Reduce friction in sharing process",
      "Incentivize without compromising quality"
    ]
  }
};