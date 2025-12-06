import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/50 p-4">
      <div className="text-center max-w-md animate-fade-in">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <h1 className="text-[120px] md:text-[160px] font-display font-bold text-primary/20 leading-none relative">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="h-16 w-16 text-primary animate-bounce-soft" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-display font-bold mb-3">
          Oops! Page not found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you're looking for seems to have wandered off. 
          Don't worry, let's get you back on track!
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            size="lg"
            className="group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate("/")}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-all"
          >
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </Button>
        </div>

        {/* Decorative element */}
        <div className="mt-12 text-sm text-muted-foreground">
          <p>Need help? <a href="/contact" className="text-primary hover:underline">Contact us</a></p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;