import { Link } from "react-router-dom";
import { Info, Mail, ShieldCheck, FileText } from "lucide-react";

const links = [
  { to: "/about", label: "About Us", icon: Info },
  { to: "/contact", label: "Contact Us", icon: Mail },
  { to: "/privacy", label: "Privacy Policy", icon: ShieldCheck },
  { to: "/terms", label: "Terms & Conditions", icon: FileText },
];

const AppFooter = () => {
  return (
    <footer className="w-full mt-6 border-t border-border/50 bg-background/60 backdrop-blur-sm">
      <div className="max-w-screen-xl mx-auto px-4 py-5 space-y-4">
        <nav className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center gap-2 sm:gap-3">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-card/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-card transition-all"
            >
              <Icon className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary transition-colors" />
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Kaung Computer. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;
