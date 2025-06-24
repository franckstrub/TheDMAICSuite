import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Completely suppress unhandled promise rejections and errors
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  if (event.message?.includes('401') || 
      event.message?.includes('Unauthorized') ||
      event.message?.includes('Failed to fetch')) {
    event.preventDefault();
    event.stopPropagation();
  }
});

// Override console.error to suppress auth errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('401') || 
      message.includes('Unauthorized') || 
      message.includes('AuthorizationResponseError') ||
      message.includes('Failed to fetch')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
