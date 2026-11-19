import { Component, type ReactNode } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Catches a page or game that failed to download, so the screen never goes blank. */
export default class ChunkErrorBoundary extends Component<{ children: ReactNode; compact?: boolean }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error("Section failed to load", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={this.props.compact ? "flex flex-col items-center gap-3 py-12 text-center" : "flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center"}>
        <WifiOff className="h-8 w-8 text-primary" />
        <p className="font-semibold text-foreground">ဖွင့်မရပါ — This page didn't load</p>
        <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
        <Button onClick={() => window.location.reload()} className="rounded-full"><RefreshCw className="mr-1.5 h-4 w-4" /> Try again</Button>
      </div>
    );
  }
}
