import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AdPlacement {
  id: string;
  name: string;
  placement_type: string;
  zone_id: string | null;
  script_code: string | null;
  page_location: string;
  position: string;
}

interface AdBannerProps {
  pageLocation: string;
  position?: string;
  className?: string;
}

const AdBanner = ({ pageLocation, position, className }: AdBannerProps) => {
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const adsInitialized = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadPlacements = async () => {
      let query = supabase
        .from("ad_placements")
        .select("*")
        .eq("is_active", true)
        .or(`page_location.eq.${pageLocation},page_location.eq.all`);

      if (position) {
        query = query.eq("position", position);
      }

      const { data } = await query.order("display_order", { ascending: true });
      
      if (data) {
        setPlacements(data);
      }
    };

    loadPlacements();
  }, [pageLocation, position]);

  useEffect(() => {
    placements.forEach((placement) => {
      const adId = placement.zone_id || placement.id;
      if (adsInitialized.current.has(adId)) return;
      adsInitialized.current.add(adId);

      if (placement.zone_id) {
        // Google AdSense ad unit - zone_id stores the ad-slot value
        try {
          // Push ad to Google AdSense
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
          console.log("AdSense push error:", e);
        }
      } else if (placement.script_code && containerRef.current) {
        // Custom script code injection
        const scriptContainer = document.createElement("div");
        scriptContainer.innerHTML = placement.script_code;

        const scripts = scriptContainer.getElementsByTagName("script");
        Array.from(scripts).forEach((oldScript) => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.innerHTML = oldScript.innerHTML;
          containerRef.current?.appendChild(newScript);
        });

        const nonScriptContent = scriptContainer.innerHTML.replace(
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          ""
        );
        if (nonScriptContent.trim() && containerRef.current) {
          const contentDiv = document.createElement("div");
          contentDiv.innerHTML = nonScriptContent;
          containerRef.current.appendChild(contentDiv);
        }
      }
    });

    return () => {
      adsInitialized.current.clear();
    };
  }, [placements]);

  if (placements.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full flex items-center justify-center",
        position === "floating" && "fixed bottom-20 left-0 right-0 z-40",
        className
      )}
    >
      {placements.map((placement) => (
        <div
          key={placement.id}
          id={`ad-container-${placement.zone_id || placement.id}`}
          className="ad-placement"
        >
          {placement.zone_id && (
            <ins
              className="adsbygoogle"
              style={{ display: "block" }}
              data-ad-client={placement.zone_id.split("/")[0] || ""}
              data-ad-slot={placement.zone_id.split("/")[1] || placement.zone_id}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default AdBanner;
