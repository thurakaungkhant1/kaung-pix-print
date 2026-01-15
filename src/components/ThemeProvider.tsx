import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("kaung-theme");
    return (stored as Theme) || "light";
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("kaung-theme", theme);
  }, [theme]);

  // Add smooth transition styles to document
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'theme-transition-styles';
    style.textContent = `
      .theme-transitioning,
      .theme-transitioning *,
      .theme-transitioning *::before,
      .theme-transitioning *::after {
        transition: background-color 0.5s ease, 
                    color 0.5s ease, 
                    border-color 0.5s ease,
                    box-shadow 0.5s ease,
                    fill 0.5s ease,
                    stroke 0.5s ease !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById('theme-transition-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    
    // Add transitioning class
    setIsTransitioning(true);
    root.classList.add('theme-transitioning');
    
    // Change theme
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    
    // Remove transitioning class after animation
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
      setIsTransitioning(false);
    }, 500);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
