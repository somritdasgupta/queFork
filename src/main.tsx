import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setBrandFavicon, setPWAIcons } from "./lib/brand-icon";

// Set programmatic favicon and PWA icons — matches header text logo exactly
setBrandFavicon(64);
setPWAIcons();

createRoot(document.getElementById("root")!).render(<App />);
