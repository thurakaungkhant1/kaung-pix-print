import { createRoot } from "react-dom/client";
import "./index.css";
import { registerAppServiceWorker } from "./lib/registerAppServiceWorker";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Application root element was not found");

void registerAppServiceWorker();
void import("./App.tsx").then(({ default: App }) => {
  createRoot(rootElement).render(<App />);
});
