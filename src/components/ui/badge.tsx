import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold tracking-tight transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/20 text-primary hover:bg-primary/30 shadow-[0_0_10px_rgba(0,255,255,0.2)] hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]",
        secondary: "border-secondary/30 bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 backdrop-blur-sm",
        destructive: "border-destructive/30 bg-destructive/20 text-destructive hover:bg-destructive/30 shadow-[0_0_10px_rgba(255,0,0,0.2)]",
        outline: "text-foreground border-foreground/20 hover:border-foreground/40 hover:bg-foreground/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
