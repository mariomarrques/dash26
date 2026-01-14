import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-primary text-white",
          "rounded-xl",
          "hover:scale-[1.02] hover:shadow-glow-accent",
          "active:scale-[0.98] active:shadow-xs",
          "shadow-sm",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "rounded-xl",
          "hover:bg-destructive/90 hover:scale-[1.02]",
          "active:scale-[0.98]",
        ].join(" "),
        outline: [
          "border border-input bg-background",
          "rounded-xl",
          "hover:bg-muted hover:text-foreground hover:border-border",
          "transition-colors",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "rounded-xl",
          "hover:bg-secondary/80",
        ].join(" "),
        ghost: [
          "rounded-xl",
          "hover:bg-muted hover:text-foreground",
        ].join(" "),
        link: [
          "text-primary underline-offset-4",
          "hover:underline",
        ].join(" "),
        accent: [
          "bg-gradient-accent text-white",
          "rounded-xl",
          "hover:scale-[1.02] hover:shadow-glow-accent",
          "active:scale-[0.98]",
          "shadow-sm",
        ].join(" "),
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
