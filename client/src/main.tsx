import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress auth-related unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('401') || 
      event.reason?.message?.includes('Unauthorized') ||
      event.reason?.message?.includes('authorization response')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
