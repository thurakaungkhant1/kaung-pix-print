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
  const scriptsLoaded = useRef<Set<string>>(new Set());

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
    // Load PropellerAds scripts for each placement
    placements.forEach((placement) => {
      if (placement.zone_id && !scriptsLoaded.current.has(placement.zone_id)) {
        scriptsLoaded.current.add(placement.zone_id);
        
        // Create and inject the PropellerAds script
        const script = document.createElement("script");
        script.async = true;
        script.setAttribute("data-cfasync", "false");
        
        // PropellerAds banner script format
        script.src = `//pl24813287.cpmrevenuegate.com/${placement.zone_id}/invoke.js`;
        
        if (containerRef.current) {
          containerRef.current.appendChild(script);
        }
      } else if (placement.script_code && !scriptsLoaded.current.has(placement.id)) {
        scriptsLoaded.current.add(placement.id);
        
        // If using custom script code, inject it
        const scriptContainer = document.createElement("div");
        scriptContainer.innerHTML = placement.script_code;
        
        // Extract and execute scripts
        const scripts = scriptContainer.getElementsByTagName("script");
        Array.from(scripts).forEach((oldScript) => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.innerHTML = oldScript.innerHTML;
          if (containerRef.current) {
            containerRef.current.appendChild(newScript);
          }
        });
        
        // Append non-script elements
        const nonScriptContent = scriptContainer.innerHTML.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        if (nonScriptContent.trim() && containerRef.current) {
          const contentDiv = document.createElement("div");
          contentDiv.innerHTML = nonScriptContent;
          containerRef.current.appendChild(contentDiv);
        }
      }
    });

    return () => {
      // Cleanup on unmount
      scriptsLoaded.current.clear();
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
      {/* PropellerAds will inject content here */}
      {placements.map((placement) => (
        <div 
          key={placement.id} 
          id={`ad-container-${placement.zone_id || placement.id}`}
          className="ad-placement"
        />
      ))}
    </div>
  );
};

export default AdBanner;