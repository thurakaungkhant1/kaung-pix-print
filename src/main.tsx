import { createRoot } from "react-dom/client";
import "./index.css";
import { installCloudFetchProxy } from "./lib/cloudFetchProxy";

installCloudFetchProxy();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Application root element was not found");

void import("./App.tsx").then(({ default: App }) => {
  createRoot(rootElement).render(<App />);
});
