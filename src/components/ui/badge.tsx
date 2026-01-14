import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-primary text-white shadow-sm",
        secondary: "border-border/60 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border bg-background",
        success: "border-transparent bg-gradient-success text-white shadow-sm",
        warning: "border-transparent bg-gradient-warm text-white shadow-sm",
        accent: "border-transparent bg-gradient-accent text-white shadow-sm",
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

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
