import { useLocation } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { useAuth } from "@/hooks/useAuth";
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
    currentTab, 
    setCurrentTab, 
    activePhase, 
    setActivePhase, 
    sidebarOpen, 
    setSidebarOpen,
    currentProject
  } = useAppContext();
  const { user } = useAuth();
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

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const sidebarClasses = cn(
    "bg-white w-64 border-r border-gray-200 fixed inset-y-0 left-0 transform transition duration-200 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen z-20",
    sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
                src={user?.profileImageUrl || undefined}
                alt="User avatar" 
                className="object-cover"
              />
              <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{getDisplayName()}</p>
              {user?.email && (
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
