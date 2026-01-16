import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterstitialAdData {
  id: string;
  zone_id: string | null;
  script_code: string | null;
}

const InterstitialAd = () => {
  const [adData, setAdData] = useState<InterstitialAdData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);
  const [settings, setSettings] = useState({ frequency: 3, cooldown: 60 });
  const location = useLocation();

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from("ad_settings")
        .select("setting_key, setting_value");
      
      if (data) {
        const settingsObj: Record<string, string> = {};
        data.forEach((s) => {
          settingsObj[s.setting_key] = s.setting_value;
        });
        setSettings({
          frequency: parseInt(settingsObj.interstitial_frequency || "3"),
          cooldown: parseInt(settingsObj.interstitial_cooldown || "60"),
        });
      }
    };

    loadSettings();
  }, []);

  // Track page navigations
  useEffect(() => {
    const navigationCount = parseInt(sessionStorage.getItem("nav_count") || "0") + 1;
    sessionStorage.setItem("nav_count", navigationCount.toString());

    const lastAdTime = parseInt(sessionStorage.getItem("last_ad_time") || "0");
    const now = Date.now();
    const cooldownPassed = (now - lastAdTime) / 1000 >= settings.cooldown;

    // Show ad every N navigations if cooldown passed
    if (navigationCount % settings.frequency === 0 && cooldownPassed && adData) {
      setIsVisible(true);
      setCountdown(5);
      setCanClose(false);
      sessionStorage.setItem("last_ad_time", now.toString());
    }
  }, [location.pathname, settings.frequency, settings.cooldown, adData]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  // Load interstitial ad configuration
  useEffect(() => {
    const loadInterstitialAd = async () => {
      const { data } = await supabase
        .from("ad_placements")
        .select("id, zone_id, script_code")
        .eq("placement_type", "interstitial")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setAdData(data);
      }
    };

    loadInterstitialAd();
  }, []);

  const handleClose = useCallback(() => {
    if (canClose) {
      setIsVisible(false);
    }
  }, [canClose]);

  // Execute ad script when visible
  useEffect(() => {
    if (!isVisible || !adData) return;

    const container = document.getElementById("interstitial-ad-content");
    if (!container) return;

    // Clear previous content
    container.innerHTML = "";

    if (adData.script_code) {
      // Custom script code
      const scriptContainer = document.createElement("div");
      scriptContainer.innerHTML = adData.script_code;
      container.appendChild(scriptContainer);

      // Execute any scripts
      const scripts = scriptContainer.getElementsByTagName("script");
      Array.from(scripts).forEach((script) => {
        const newScript = document.createElement("script");
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        document.head.appendChild(newScript);
      });
    } else if (adData.zone_id) {
      // PropellerAds zone
      const script = document.createElement("script");
      script.src = `//pl25847210.cpmrevenuegate.com/${adData.zone_id}.js`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [isVisible, adData]);

  if (!isVisible || !adData) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-fade-in">
      {/* Close button */}
      <button
        onClick={handleClose}
        disabled={!canClose}
        className={cn(
          "absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full transition-all",
          canClose
            ? "bg-white text-black hover:bg-gray-200 cursor-pointer"
            : "bg-gray-600 text-gray-400 cursor-not-allowed"
        )}
      >
        {canClose ? (
          <>
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">Close</span>
          </>
        ) : (
          <span className="text-sm font-medium">Skip in {countdown}s</span>
        )}
      </button>

      {/* Ad content */}
      <div className="w-full max-w-lg mx-4">
        <div
          id="interstitial-ad-content"
          className="bg-muted rounded-2xl p-6 min-h-[300px] flex items-center justify-center"
        >
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Advertisement</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterstitialAd;
