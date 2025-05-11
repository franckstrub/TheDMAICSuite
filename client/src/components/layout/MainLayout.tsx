import { useEffect } from "react";
import { useAppContext } from "@/store/AppContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen, setSidebarOpen, user } = useAppContext();

  // Close sidebar on Escape key press
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [sidebarOpen, setSidebarOpen]);

  // Close sidebar on resize to desktop if open
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [sidebarOpen, setSidebarOpen]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex flex-1">
        <Sidebar />
        
        {/* Overlay for sidebar on mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 md:hidden z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 pb-10 pt-0">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
          {/* Copyright Footer */}
          <footer className="text-center text-sm text-gray-600 py-4 border-t border-gray-200 mt-auto">
            <p>
              Copyright © {new Date().getFullYear()} <a href="https://equable.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Equable</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;The Lean Six Sigma DMAIC Suite™ is edited by <a href="https://equable.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Equable</a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
