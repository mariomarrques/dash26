import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Interactive gradient orb that follows mouse with more intensity
const InteractiveGradientOrb = ({ 
  mouseX, 
  mouseY,
  baseX,
  baseY,
  size,
  color,
  intensity = 1
}: { 
  mouseX: number;
  mouseY: number;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
  intensity?: number;
}) => (
  <div
    className="absolute rounded-full blur-3xl transition-transform duration-500 ease-out"
    style={{
      width: size,
      height: size,
      background: color,
      left: `${baseX}%`,
      top: `${baseY}%`,
      transform: `translate(${mouseX * intensity}px, ${mouseY * intensity}px)`,
      opacity: 0.4,
    }}
  />
);

// Animated flowing gradient background
const FlowingGradient = ({ mouseX, mouseY }: { mouseX: number; mouseY: number }) => (
  <div 
    className="absolute inset-0 transition-all duration-700 ease-out"
    style={{
      background: `
        radial-gradient(ellipse 80% 60% at ${50 + mouseX * 0.3}% ${40 + mouseY * 0.3}%, rgba(139, 92, 246, 0.25) 0%, transparent 50%),
        radial-gradient(ellipse 60% 80% at ${70 + mouseX * 0.2}% ${60 + mouseY * 0.2}%, rgba(236, 72, 153, 0.2) 0%, transparent 50%),
        radial-gradient(ellipse 70% 50% at ${30 - mouseX * 0.25}% ${70 - mouseY * 0.25}%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)
      `,
    }}
  />
);

// Mobile scroll-reactive gradient
const MobileGradient = ({ scrollY }: { scrollY: number }) => (
  <div 
    className="absolute inset-0 transition-all duration-300 ease-out"
    style={{
      background: `
        radial-gradient(ellipse 100% 80% at 50% ${30 + scrollY * 0.1}%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
        radial-gradient(ellipse 80% 100% at 80% ${60 - scrollY * 0.05}%, rgba(236, 72, 153, 0.2) 0%, transparent 50%),
        radial-gradient(ellipse 90% 70% at 20% ${80 + scrollY * 0.08}%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)
      `,
    }}
  />
);

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isMobile = useIsMobile();
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if any loading state is active
  const isAnyLoading = loading || googleLoading;

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Mouse parallax effect (desktop only) - ENHANCED intensity
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Enhanced intensity: multiplier increased from 20 to 60
      setMousePosition({
        x: (clientX / innerWidth - 0.5) * 60,
        y: (clientY / innerHeight - 0.5) * 60,
      });
    };

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Mobile scroll parallax effect
  useEffect(() => {
    if (!isMobile) return;
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Redirect if already logged in
  if (user) {
    navigate('/');
    return null;
  }

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        setGoogleLoading(false);
        toast({
          title: 'Erro ao entrar com Google',
          description: 'Não foi possível conectar. Verifique sua conexão e tente novamente.',
          variant: 'destructive'
        });
      }
      // Note: On success, OAuth redirects - no need to setGoogleLoading(false)
    } catch (err) {
      setGoogleLoading(false);
      toast({
        title: 'Erro inesperado',
        description: 'Não foi possível conectar ao Google. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  // Handle successful login with micro-animation before redirect
  const handleLoginSuccess = () => {
    setLoginSuccess(true);
    
    // Brief success feedback, then start exit animation
    setTimeout(() => {
      setIsExiting(true);
      
      // Navigate after exit animation
      setTimeout(() => {
        navigate('/');
      }, 300);
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setLoading(false);
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Credenciais inválidas',
              description: 'Email ou senha incorretos. Verifique e tente novamente.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Não foi possível entrar',
              description: 'Verifique seus dados e tente novamente.',
              variant: 'destructive'
            });
          }
        } else {
          // Success! Trigger micro-animation before redirect
          handleLoginSuccess();
        }
      } else {
        const { error } = await signUp(email, password, name || undefined);
        setLoading(false);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Email já cadastrado',
              description: 'Esse email já está em uso. Tente fazer login ou use outro email.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Erro ao criar conta',
              description: error.message,
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Conta criada!',
            description: 'Verifique seu email para confirmar o cadastro.',
          });
          setIsLogin(true);
        }
      }
    } catch (err) {
      setLoading(false);
      toast({
        title: 'Erro inesperado',
        description: 'Algo deu errado. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "min-h-screen min-h-[100dvh] relative overflow-x-hidden bg-[#0a0a0f]",
        "transition-opacity duration-300 ease-out",
        isExiting && "opacity-0"
      )}
    >
      {/* Animated Background - Desktop with mouse parallax */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]" />
          
          {/* Flowing gradients that follow mouse */}
          <FlowingGradient mouseX={mousePosition.x} mouseY={mousePosition.y} />
          
          {/* Interactive orbs with different intensities */}
          <InteractiveGradientOrb 
            mouseX={mousePosition.x} 
            mouseY={mousePosition.y} 
            baseX={-5} 
            baseY={-5} 
            size={700} 
            color="radial-gradient(circle, hsl(265, 89%, 45%) 0%, transparent 60%)"
            intensity={1.2}
          />
          <InteractiveGradientOrb 
            mouseX={mousePosition.x} 
            mouseY={mousePosition.y} 
            baseX={65} 
            baseY={55} 
            size={550} 
            color="radial-gradient(circle, hsl(280, 80%, 40%) 0%, transparent 60%)"
            intensity={0.8}
          />
          <InteractiveGradientOrb 
            mouseX={mousePosition.x} 
            mouseY={mousePosition.y} 
            baseX={45} 
            baseY={-15} 
            size={450} 
            color="radial-gradient(circle, hsl(220, 90%, 50%) 0%, transparent 60%)"
            intensity={1.5}
          />
          <InteractiveGradientOrb 
            mouseX={mousePosition.x} 
            mouseY={mousePosition.y} 
            baseX={85} 
            baseY={15} 
            size={400} 
            color="radial-gradient(circle, hsl(340, 80%, 45%) 0%, transparent 60%)"
            intensity={0.6}
          />
          
          {/* Grid overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          />
          
          {/* Radial glow from center - also follows mouse */}
          <div 
            className="absolute inset-0 transition-all duration-500 ease-out"
            style={{
              background: `radial-gradient(ellipse at ${50 + mousePosition.x * 0.5}% ${50 + mousePosition.y * 0.5}%, rgba(139,92,246,0.2) 0%, transparent 60%)`,
            }}
          />
        </div>
      )}

      {/* Animated Background - Mobile with scroll parallax */}
      {isMobile && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]" />
          
          {/* Mobile flowing gradients that react to scroll */}
          <MobileGradient scrollY={scrollY} />
          
          {/* Simplified orbs for mobile - static but animated */}
          <div 
            className="absolute rounded-full blur-3xl opacity-40 animate-pulse-slow"
            style={{
              width: 400,
              height: 400,
              background: 'radial-gradient(circle, hsl(265, 89%, 45%) 0%, transparent 60%)',
              left: '-15%',
              top: '-10%',
            }}
          />
          <div 
            className="absolute rounded-full blur-3xl opacity-30 animate-pulse-slow-delayed"
            style={{
              width: 350,
              height: 350,
              background: 'radial-gradient(circle, hsl(280, 80%, 40%) 0%, transparent 60%)',
              right: '-10%',
              top: '50%',
            }}
          />
          <div 
            className="absolute rounded-full blur-3xl opacity-25 animate-pulse-slow"
            style={{
              width: 300,
              height: 300,
              background: 'radial-gradient(circle, hsl(340, 80%, 45%) 0%, transparent 60%)',
              left: '20%',
              bottom: '-5%',
            }}
          />
        </div>
      )}

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen min-h-[100dvh] flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 py-8 lg:py-0">
        
        {/* Left side - Hero Text (Desktop only) */}
        <div 
          className={cn(
            "hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-12 transition-all duration-1000 ease-out",
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
          )}
        >
          <div className="max-w-xl text-center lg:text-left">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight tracking-tight">
              <span className="text-white">Bem-vindo ao </span>
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
                coração e cérebro
              </span>
              <span className="text-white"> do seu negócio</span>
            </h1>
            <p className="mt-6 text-lg text-white/50">
              Controle financeiro e operacional para quem trabalha com camisas esportivas.
            </p>
          </div>
        </div>

        {/* Right side / Center - Login Card Container */}
        <div 
          className={cn(
            "w-full lg:w-1/2 flex flex-col items-center justify-center transition-all duration-1000 ease-out delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          )}
        >
          {/* Mobile Hero Text - Simplified, no subtitle */}
          <div className="lg:hidden text-center mb-6 sm:mb-8 px-2">
            <h1 className="text-[1.625rem] sm:text-3xl font-bold leading-snug tracking-tight">
              <span className="text-white">Bem-vindo ao </span>
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
                coração e cérebro
              </span>
              <span className="text-white"> do seu negócio</span>
            </h1>
          </div>

          {/* Glass Card - Enhanced for mobile with loading overlay */}
          <div 
            className={cn(
              "w-full max-w-md mx-auto relative",
              "bg-white/[0.04] lg:bg-white/[0.03] backdrop-blur-xl",
              "border border-white/[0.15] lg:border-white/10",
              "rounded-2xl sm:rounded-3xl",
              "p-6 sm:p-8 lg:p-8",
              "shadow-2xl shadow-purple-500/10",
              "transition-all duration-500 ease-out delay-300",
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
              loginSuccess && "scale-[0.98] opacity-90"
            )}
          >
            {/* Loading Overlay */}
            <div 
              className={cn(
                "absolute inset-0 rounded-2xl sm:rounded-3xl z-20",
                "bg-black/20 backdrop-blur-[2px]",
                "flex items-center justify-center",
                "transition-opacity duration-200",
                isAnyLoading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              )}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl animate-pulse" />
                  <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-purple-400 relative" />
                </div>
                <span className="text-white/70 text-sm font-medium">
                  {googleLoading ? 'Conectando ao Google...' : 'Autenticando...'}
                </span>
              </div>
            </div>
            {/* Card Header */}
            <div className="text-center mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">
                {isLogin ? 'Entrar' : 'Criar conta'}
              </h2>
              <p className="mt-1.5 text-sm text-white/50">
                {isLogin 
                  ? 'Acesse seu painel de controle'
                  : 'Comece a organizar seu negócio'
                }
              </p>
            </div>

            {/* Google Sign In Button - Enhanced touch target for mobile */}
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full min-h-[52px] h-auto py-3 gap-3 font-medium",
                "bg-white hover:bg-gray-50",
                "text-gray-800",
                "border-0",
                "rounded-xl",
                "shadow-lg shadow-black/20",
                "transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98]",
                "disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              )}
              onClick={handleGoogleSignIn}
              disabled={isAnyLoading || loginSuccess}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                  <span className="text-base">Conectando...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span className="text-base">Entrar com Google</span>
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-5 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-3 text-white/40">
                  ou continue com email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/70 text-sm font-medium">
                    Nome (opcional)
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading || googleLoading}
                    className={cn(
                      "h-12 sm:h-12 rounded-xl w-full",
                      "bg-white/[0.08] border-white/20",
                      "text-white placeholder:text-white/40",
                      "focus:border-purple-500/60 focus:ring-purple-500/30 focus:ring-2",
                      "transition-all duration-200"
                    )}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70 text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  disabled={loading || googleLoading}
                  className={cn(
                    "h-12 sm:h-12 rounded-xl w-full",
                    "bg-white/[0.08] border-white/20",
                    "text-white placeholder:text-white/40",
                    "focus:border-purple-500/60 focus:ring-purple-500/30 focus:ring-2",
                    "transition-all duration-200",
                    errors.email && "border-red-500/50"
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70 text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    disabled={loading || googleLoading}
                    className={cn(
                      "h-12 sm:h-12 rounded-xl pr-12 w-full",
                      "bg-white/[0.08] border-white/20",
                      "text-white placeholder:text-white/40",
                      "focus:border-purple-500/60 focus:ring-purple-500/30 focus:ring-2",
                      "transition-all duration-200",
                      errors.password && "border-red-500/50"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className={cn(
                  "w-full min-h-[52px] h-auto py-3 mt-2 relative overflow-hidden",
                  "bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500",
                  "hover:from-purple-500 hover:via-purple-400 hover:to-pink-400",
                  "text-white text-base font-semibold",
                  "rounded-xl",
                  "shadow-lg shadow-purple-500/25",
                  "transition-all duration-200",
                  "hover:scale-[1.02] hover:shadow-purple-500/40",
                  "active:scale-[0.98]",
                  "disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100",
                  loginSuccess && "bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-500/40"
                )}
                disabled={isAnyLoading || loginSuccess}
              >
                {/* Success glow effect */}
                {loginSuccess && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/50 to-green-400/50 animate-pulse" />
                )}
                
                <span className="relative flex items-center justify-center gap-2">
                  {loginSuccess ? (
                    <>
                      <Check className="h-5 w-5 animate-scale-in" />
                      <span>Sucesso!</span>
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{isLogin ? 'Entrando...' : 'Criando conta...'}</span>
                    </>
                  ) : (
                    isLogin ? 'Entrar' : 'Criar conta'
                  )}
                </span>
              </Button>
            </form>

            {/* Toggle Login/Signup */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                disabled={isAnyLoading || loginSuccess}
                className={cn(
                  "text-sm text-white/50 hover:text-white transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLogin 
                  ? <>Não tem conta? <span className="text-purple-400 font-medium">Criar agora</span></>
                  : <>Já tem conta? <span className="text-purple-400 font-medium">Entrar</span></>
                }
              </button>
            </div>
          </div>
          {/* Close the card div that was opened with the loading overlay */}
        </div>
      </div>

      {/* Footer - Hidden on mobile for cleaner experience */}
      <div className="hidden lg:block absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-white/20">© 2024 Painel 55</p>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }
        
        @keyframes pulse-slow-delayed {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.08);
          }
        }
        
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        
        .animate-pulse-slow-delayed {
          animation: pulse-slow-delayed 10s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse-slow,
          .animate-pulse-slow-delayed,
          .animate-scale-in {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
