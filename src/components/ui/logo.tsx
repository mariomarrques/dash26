import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "text";
  showText?: boolean;
  /** Força texto escuro independente do tema (para uso na sidebar light) */
  forceDarkText?: boolean;
  /** Força texto branco (para fundos escuros como tela de login) */
  forceWhiteText?: boolean;
}

/**
 * Dash 26 Logo Component
 * Identidade visual: Fintech premium com laranja queimado/cobre
 * Suporta dark/light theme automaticamente
 */
export function Logo({ 
  className, 
  size = "md", 
  variant = "full",
  showText = true,
  forceDarkText = false,
  forceWhiteText = false
}: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-base", gap: "gap-1.5" },
    md: { icon: 32, text: "text-xl", gap: "gap-2" },
    lg: { icon: 40, text: "text-2xl", gap: "gap-2.5" },
    xl: { icon: 56, text: "text-3xl", gap: "gap-3" },
  };

  const { icon: iconSize, text: textSize, gap } = sizes[size];

  // Icon only
  if (variant === "icon") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <LogoIcon size={iconSize} />
      </div>
    );
  }

  // Text only
  if (variant === "text") {
    return (
      <div className={cn("flex items-center", className)}>
        <LogoText className={textSize} forceDarkText={forceDarkText} forceWhiteText={forceWhiteText} />
      </div>
    );
  }

  // Full logo (icon + text)
  return (
    <div className={cn("flex items-center", gap, className)}>
      <LogoIcon size={iconSize} />
      {showText && <LogoText className={textSize} forceDarkText={forceDarkText} forceWhiteText={forceWhiteText} />}
    </div>
  );
}

function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="dash26-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E85D04" />
          <stop offset="50%" stopColor="#F48C06" />
          <stop offset="100%" stopColor="#FAA307" />
        </linearGradient>
        <linearGradient id="dash26-gradient-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D35400" />
          <stop offset="100%" stopColor="#E85D04" />
        </linearGradient>
      </defs>
      
      {/* Main shape - Abstract D with bar representing dashboard/metrics */}
      <rect 
        x="4" 
        y="4" 
        width="40" 
        height="40" 
        rx="12" 
        fill="url(#dash26-gradient)"
      />
      
      {/* Inner design - stylized "26" */}
      <path
        d="M14 14h8c5.5 0 10 4.5 10 10s-4.5 10-10 10h-8V14z"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      
      {/* Metric bar - representing dashboard */}
      <rect
        x="18"
        y="20"
        width="8"
        height="3"
        rx="1.5"
        fill="white"
        opacity="0.9"
      />
      
      <rect
        x="18"
        y="25"
        width="5"
        height="3"
        rx="1.5"
        fill="white"
        opacity="0.7"
      />
    </svg>
  );
}

function LogoText({ 
  className, 
  forceDarkText, 
  forceWhiteText 
}: { 
  className?: string; 
  forceDarkText?: boolean;
  forceWhiteText?: boolean;
}) {
  // Determinar a cor do texto "Dash"
  const getTextColor = () => {
    if (forceWhiteText) return "text-white";
    if (forceDarkText) return "text-sidebar-accent-foreground";
    return "text-foreground";
  };

  return (
    <span className={cn(
      "font-bold tracking-tight",
      className
    )}>
      <span className={getTextColor()}>Dash</span>
      <span className="text-primary"> 26</span>
    </span>
  );
}

/**
 * Favicon component for use in HTML head
 * Export as data URL for favicon usage
 */
export function LogoFavicon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="favicon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E85D04" />
          <stop offset="100%" stopColor="#FAA307" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#favicon-gradient)" />
      <path
        d="M14 14h8c5.5 0 10 4.5 10 10s-4.5 10-10 10h-8V14z"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="18" y="20" width="8" height="3" rx="1.5" fill="white" opacity="0.9" />
      <rect x="18" y="25" width="5" height="3" rx="1.5" fill="white" opacity="0.7" />
    </svg>
  );
}

export default Logo;

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
