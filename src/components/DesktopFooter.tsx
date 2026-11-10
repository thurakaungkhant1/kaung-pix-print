import { Link, useLocation } from "react-router-dom";
import { ShieldCheck, Zap, Headphones } from "lucide-react";
import logo from "@/assets/app-logo.png";

const COLUMNS = [
  {
    title: "Top-Up",
    links: [
      { to: "/game?g=", label: "All Games" },
      { to: "/game?g=mobile-legends", label: "Mobile Legends" },
      { to: "/game?g=k-pubgm", label: "PUBG Mobile" },
      { to: "/game?view=shop", label: "Digital Shop" },
    ],
  },
  {
    title: "My Account",
    links: [
      { to: "/account", label: "Account" },
      { to: "/orders", label: "My Orders" },
      { to: "/top-up", label: "Wallet Top-Up" },
      { to: "/wallet-history", label: "Wallet History" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact Us" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms & Conditions" },
    ],
  },
];

// Desktop-only (lg+) store footer; mobile pages keep their own layout.
const DesktopFooter = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/auth") || pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-16 hidden bg-nav text-nav-foreground lg:block">
      <div className="mx-auto grid max-w-7xl grid-cols-5 gap-10 px-8 py-12">
        <div className="col-span-2">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="" className="h-11 w-11 rounded-xl bg-card object-cover" />
            <span className="text-xl font-display font-extrabold">Kaung <span className="text-nav-active">Digital Store</span></span>
          </Link>
          <p className="mt-4 max-w-sm text-sm text-nav-muted">
            Myanmar's game top-up store for Mobile Legends, PUBG Mobile and 200+ games. Fast delivery, fair MMK prices, secure wallet payments.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[{ i: Zap, t: "Instant" }, { i: ShieldCheck, t: "Secure" }, { i: Headphones, t: "24/7 Support" }].map(({ i: Icon, t }) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-nav-foreground/15 px-3 py-1 text-xs font-semibold">
                <Icon className="h-3.5 w-3.5 text-nav-active" /> {t}
              </span>
            ))}
          </div>
          <a href="https://t.me/kaungdigitalstore" target="_blank" rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-accent transition-colors">
            Join our Telegram
          </a>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-bold uppercase tracking-wider">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-nav-muted hover:text-nav-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-nav-foreground/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5 text-xs text-nav-muted">
          <span>© {new Date().getFullYear()} Kaung Computer. All rights reserved.</span>
          <span>Payments: KPay · WavePay · Wallet</span>
        </div>
      </div>
    </footer>
  );
};

export default DesktopFooter;
