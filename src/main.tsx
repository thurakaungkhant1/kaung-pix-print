import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installBackendFetchFallback } from "./lib/backendFetchFallback";

installBackendFetchFallback();

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
