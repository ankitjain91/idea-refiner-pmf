import { SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";

interface PaywallOverlayProps {
  feature: keyof typeof SUBSCRIPTION_TIERS.free.features;
  children: React.ReactNode;
  blurContent?: boolean;
}

export default function PaywallOverlay({ feature, children, blurContent = true }: PaywallOverlayProps) {
  // All users have enterprise access - never show paywall
  return <>{children}</>;
}