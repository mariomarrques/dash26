import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { TrendingUp } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-alt">
      <div className="text-center animate-fade-in-up">
        <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto mb-6 flex items-center justify-center">
          <TrendingUp size={32} className="text-white" />
        </div>
        <h1 className="mb-4 text-5xl font-bold gradient-text">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! Página não encontrada</p>
        <a 
          href="/" 
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-gradient-primary text-white font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-glow-accent"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
