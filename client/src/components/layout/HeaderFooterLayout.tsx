import { useAuth } from "@/hooks/useAuth";
import Header from "./Header";

interface HeaderFooterLayoutProps {
  children: React.ReactNode;
}

export default function HeaderFooterLayout({ children }: HeaderFooterLayoutProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      {/* Main Content - Full width without sidebar */}
      <main className="flex-1 overflow-y-auto bg-gray-50 pb-10 pt-0">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
        {/* Copyright Footer */}
        <footer className="text-center text-sm text-gray-600 py-4 border-t border-gray-200 mt-auto">
          <p className="mb-2">
            Copyright © {new Date().getFullYear()} <a href="https://equable.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Equable</a>
            &nbsp;&nbsp;|&nbsp;&nbsp;The Lean Six Sigma DMAIC Suite™ is edited by <a href="https://equable.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Equable</a>
          </p>
          <a href="https://www.linkedin.com/in/franckstrubequable/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:text-primary-dark">
            <i className="fab fa-linkedin text-lg"></i>
          </a>
        </footer>
      </main>
    </div>
  );
}