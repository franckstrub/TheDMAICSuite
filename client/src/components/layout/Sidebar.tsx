import { useLocation } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Database, 
  Target, 
  Ruler, 
  BarChart3, 
  TrendingUp, 
  SlidersHorizontal, 
  ServerCog, 
  Settings, 
  X 
} from "lucide-react";

export default function Sidebar() {
  const { 
    user, 
    currentTab, 
    setCurrentTab, 
    activePhase, 
    setActivePhase, 
    sidebarOpen, 
    setSidebarOpen,
    currentProject
  } = useAppContext();
  const [location, navigate] = useLocation();

  const navigateTo = (tab: string, phase?: string) => {
    setCurrentTab(tab);
    if (phase) {
      setActivePhase(phase);
      
      // If we're navigating to a DMAIC phase and have a current project, include the project ID
      if (tab === "dmaic" && currentProject?.id) {
        navigate(`/app/${tab}/${phase}/${currentProject.id}`);
      } else {
        navigate(`/app/${tab}/${phase}`);
      }
    } else {
      navigate(`/app/${tab}`);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const sidebarClasses = cn(
    "bg-white w-64 border-r border-gray-200 fixed left-0 transform transition duration-200 ease-in-out z-40",
    sidebarOpen ? "translate-x-0" : "-translate-x-full",
    "md:translate-x-0 top-16 bottom-0" // Add top offset for header and ensure it's fixed on desktop too
  );

  return (
    <aside className={sidebarClasses}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-primary font-bold text-xl">
              <i className="fas fa-chart-line text-secondary mr-2"></i>
              <span>Lean Six Sigma DMAIC Suite™</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 py-4 px-2 space-y-1">
          <div className="px-3 mb-3">
            <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Main</h3>
          </div>
          
          <Button
            variant={currentTab === "dashboard" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("dashboard")}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            <span>Dashboard</span>
          </Button>
          
          <Button
            variant={currentTab === "projects" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("projects")}
          >
            <FolderKanban className="w-5 h-5 mr-3" />
            <span>Projects</span>
          </Button>
          
          <Button
            variant={currentTab === "data" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("data")}
          >
            <Database className="w-5 h-5 mr-3" />
            <span>Data Management</span>
          </Button>
          
          <div className="px-3 mt-6 mb-3">
            <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">DMAIC Tools</h3>
          </div>
          
          <Button
            variant={currentTab === "dmaic" && activePhase === "define" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("dmaic", "define")}
          >
            <Target className="w-5 h-5 mr-3" />
            <span>Define</span>
          </Button>
          
          <Button
            variant={currentTab === "dmaic" && activePhase === "measure" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("dmaic", "measure")}
          >
            <Ruler className="w-5 h-5 mr-3" />
            <span>Measure</span>
          </Button>
          
          <Button
            variant={currentTab === "dmaic" && activePhase === "analyze" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("dmaic", "analyze")}
          >
            <BarChart3 className="w-5 h-5 mr-3" />
            <span>Analyze</span>
          </Button>
          
          <Button
            variant={currentTab === "dmaic" && activePhase === "improve" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("dmaic", "improve")}
          >
            <TrendingUp className="w-5 h-5 mr-3" />
            <span>Improve</span>
          </Button>
          
          <Button
            variant={currentTab === "dmaic" && activePhase === "control" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("dmaic", "control")}
          >
            <SlidersHorizontal className="w-5 h-5 mr-3" />
            <span>Control</span>
          </Button>
          
          <div className="px-3 mt-6 mb-3">
            <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Settings</h3>
          </div>
          
          <Button
            variant={currentTab === "storage" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("storage")}
          >
            <ServerCog className="w-5 h-5 mr-3" />
            <span>Storage Options</span>
          </Button>
          
          <Button
            variant={currentTab === "settings" ? "default" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => navigateTo("settings")}
          >
            <Settings className="w-5 h-5 mr-3" />
            <span>Settings</span>
          </Button>
        </ScrollArea>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                alt="User avatar" 
              />
              <AvatarFallback>{getInitials(user?.fullName)}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.fullName || "User"}</p>
              <p className="text-xs text-gray-500">{user?.role || "User"}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
