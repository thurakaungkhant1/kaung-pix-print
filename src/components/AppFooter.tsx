import { Link } from "react-router-dom";

const AppFooter = () => {
  return (
    <footer className="mt-8 border-t border-border/50 bg-background/40 backdrop-blur-sm">
      <div className="max-w-screen-xl mx-auto px-4 py-5 space-y-3">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About Us</Link>
          <span className="text-border">•</span>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link>
          <span className="text-border">•</span>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
          <span className="text-border">•</span>
          <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</Link>
        </nav>
        <p className="text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Kaung Computer. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;
