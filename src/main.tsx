import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installBackendFallbackFetch } from "./lib/networkFallback";

installBackendFallbackFetch();

createRoot(document.getElementById("root")!).render(<App />);
