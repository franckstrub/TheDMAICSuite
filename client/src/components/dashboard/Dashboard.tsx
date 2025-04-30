import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/store/AppContext";
import StatsCard from "./StatsCard";
import ProjectsTable from "./ProjectsTable";
import ActivityItem from "./ActivityItem";
import { Button } from "@/components/ui/button";
import { ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from "recharts";

// Sample data for charts
const performanceData = [
  { name: "Jan", value: 65 },
  { name: "Feb", value: 59 },
  { name: "Mar", value: 80 },
  { name: "Apr", value: 81 },
  { name: "May", value: 56 },
  { name: "Jun", value: 55 },
  { name: "Jul", value: 40 },
];

const defectData = [
  { name: "Documentation", value: 42 },
  { name: "System Issues", value: 27 },
  { name: "Approvals", value: 25 },
  { name: "Training", value: 18 },
  { name: "Communication", value: 8 },
];

export default function Dashboard() {
  const { user, currency, implementationStatus, setImplementationStatus } = useAppContext();
  const [timeframe, setTimeframe] = useState("Last 365 Days");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{start?: Date, end?: Date}>({});
  
  // Handle timeframe change
  useEffect(() => {
    if (timeframe === "Custom Range") {
      setShowDateRangePicker(true);
    } else {
      setShowDateRangePicker(false);
    }
  }, [timeframe]);
  
  // Custom date range formatted string
  const customRangeString = customDateRange.start && customDateRange.end
    ? `${format(customDateRange.start, 'MMM d, yyyy')} - ${format(customDateRange.end, 'MMM d, yyyy')}`
    : '';

  // Append custom range to timeframe for queryKey if using custom range
  const effectiveTimeframe = 
    timeframe === "Custom Range" && customDateRange.start && customDateRange.end
      ? `${timeframe}:${customRangeString}`
      : timeframe;

  // Define types for the project and project data structure
  type Project = {
    id: number;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    userId: number;
    phases?: {
      define?: { status: string };
      measure?: { status: string };
      analyze?: { status: string };
      improve?: { status: string };
      control?: { status: string };
    };
    benefits?: {
      qualityCostSavings?: number;
      workingCapitalGains?: number;
      wacc?: number;
      fteBenefits?: number;
      avgFTECost?: number;
      [key: string]: any;
    };
    costs?: {
      oneOffPeopleCost?: number;
      oneOffTechnologyCost?: number;
      oneOffOtherCost?: number;
      opexPeopleCost?: number;
      opexTechnologyCost?: number;
      opexOtherCost?: number;
      capexCost?: number;
      [key: string]: any;
    };
    [key: string]: any;
  }
  
  type ProjectsData = {
    projects: Project[];
    [key: string]: any;
  }
  
  // Helper function to check if a project is implemented
  const isProjectImplemented = (project: any) => {
    // A project is implemented if Improve phase is completed AND Control phase is in progress or completed
    return (
      project.phases?.improve?.status === "completed" && 
      (project.phases?.control?.status === "in-progress" || project.phases?.control?.status === "completed")
    );
  };
  
  // Helper function to calculate metrics based on projects
  const calculateMetric = (projects: Project[], metricType: string): number => {
    if (!projects || projects.length === 0) return 0;
    
    return projects.reduce((total, project) => {
      // Get the value from the project, default to 0 if not found
      let value = 0;
      
      switch(metricType) {
        // Benefit metrics
        case 'qualityCostSavings':
          value = project.benefits?.qualityCostSavings || 0;
          break;
        case 'workingCapitalGains':
          value = project.benefits?.workingCapitalGains || 0;
          break;
        case 'financialSavings':
          // Financial savings is typically calculated as Working Capital Gains * WACC
          const wacc = project.benefits?.wacc || 0.1; // Default to 10% WACC if not specified
          value = (project.benefits?.workingCapitalGains || 0) * wacc;
          break;
        case 'fteBenefits':
          value = project.benefits?.fteBenefits || 0;
          break;
        case 'fteValue':
          // FTE value is typically calculated as FTE Benefits * Average FTE Cost
          const avgFTECost = project.benefits?.avgFTECost || 139000; // Default average FTE cost
          value = (project.benefits?.fteBenefits || 0) * avgFTECost;
          break;
          
        // Cost metrics
        case 'oneOffCosts':
          value = (project.costs?.oneOffPeopleCost || 0) + 
                  (project.costs?.oneOffTechnologyCost || 0) + 
                  (project.costs?.oneOffOtherCost || 0);
          break;
        case 'opexCosts':
          value = (project.costs?.opexPeopleCost || 0) + 
                  (project.costs?.opexTechnologyCost || 0) + 
                  (project.costs?.opexOtherCost || 0);
          break;
        case 'capexCosts':
          value = project.costs?.capexCost || 0;
          break;
        case 'totalCosts':
          value = (project.costs?.oneOffPeopleCost || 0) + 
                  (project.costs?.oneOffTechnologyCost || 0) + 
                  (project.costs?.oneOffOtherCost || 0) +
                  (project.costs?.opexPeopleCost || 0) + 
                  (project.costs?.opexTechnologyCost || 0) + 
                  (project.costs?.opexOtherCost || 0) +
                  (project.costs?.capexCost || 0);
          break;
        default:
          value = 0;
      }
      
      return total + value;
    }, 0);
  };
  
  // Fetch projects - focus on ones created by current user
  const { data: allProjects, isLoading: isLoadingProjects } = useQuery<ProjectsData>({
    queryKey: ["/api/projects", user?.id, effectiveTimeframe],
    enabled: !!user?.id,
  });
  
  // Add sample benefits data to projects for demonstration
  const projectsWithBenefits = useMemo(() => {
    if (!allProjects?.projects) return { projects: [] };

    // Sample benefits data based on implementation status
    const implementedBenefits = {
      qualityCostSavings: 642000,
      workingCapitalGains: 256200,
      wacc: 0.1,
      fteBenefits: 2.8,
      avgFTECost: 139000
    };

    const notImplementedBenefits = {
      qualityCostSavings: 200000,
      workingCapitalGains: 100000,
      wacc: 0.1,
      fteBenefits: 0.7,
      avgFTECost: 139000
    };
    
    // Sample cost data based on implementation status
    const implementedCosts = {
      oneOffPeopleCost: 35000,
      oneOffTechnologyCost: 18000,
      oneOffOtherCost: 7500,
      opexPeopleCost: 22000,
      opexTechnologyCost: 9500,
      opexOtherCost: 4000,
      capexCost: 75000
    };
    
    const notImplementedCosts = {
      oneOffPeopleCost: 15000,
      oneOffTechnologyCost: 7500,
      oneOffOtherCost: 2500,
      opexPeopleCost: 10000,
      opexTechnologyCost: 4500,
      opexOtherCost: 1500,
      capexCost: 25000
    };

    // Sample phases data
    const implementedPhases = {
      define: { status: "completed" },
      measure: { status: "completed" },
      analyze: { status: "completed" },
      improve: { status: "completed" },
      control: { status: "in-progress" }
    };

    const notImplementedPhases = {
      define: { status: "completed" },
      measure: { status: "completed" },
      analyze: { status: "in-progress" },
      improve: { status: "not-started" },
      control: { status: "not-started" }
    };

    // For demonstration, we'll make sure we have at least one project of each type
    // Create a modified project array with at least one implemented and one not implemented project
    const modifiedProjects = [...allProjects.projects];
    
    // If we have at least one project, ensure it has benefits and phases
    if (modifiedProjects.length > 0) {
      // First project (index 0) is not implemented
      modifiedProjects[0] = {
        ...modifiedProjects[0],
        phases: notImplementedPhases,
        benefits: notImplementedBenefits,
        costs: notImplementedCosts
      };
      
      // Create a second, implemented project by cloning the first if needed
      if (modifiedProjects.length === 1) {
        const implementedProject = {
          ...modifiedProjects[0],
          id: 2, // Give it a new ID
          title: "Implemented " + modifiedProjects[0].title,
          phases: implementedPhases,
          benefits: implementedBenefits,
          costs: implementedCosts
        };
        modifiedProjects.push(implementedProject);
      } else {
        // We have at least 2 projects, make the second one implemented
        modifiedProjects[1] = {
          ...modifiedProjects[1],
          phases: implementedPhases,
          benefits: implementedBenefits,
          costs: implementedCosts
        };
      }
    }
    
    return {
      ...allProjects,
      projects: modifiedProjects
    };
  }, [allProjects]);
  
  // Filter projects based on implementation status
  const projects = useMemo(() => {
    if (!projectsWithBenefits?.projects) return { projects: [] };
    
    // If implementation status is "all", return all projects
    if (implementationStatus === "all") {
      return projectsWithBenefits;
    }
    
    // Filter projects based on implementation status
    const filteredProjects = projectsWithBenefits.projects.filter((project: Project) => {
      const implemented = isProjectImplemented(project);
      return implementationStatus === "implemented" ? implemented : !implemented;
    });
    
    return { ...projectsWithBenefits, projects: filteredProjects };
  }, [projectsWithBenefits, implementationStatus]);

  // Fetch activity logs
  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["/api/activity-logs", effectiveTimeframe],
    enabled: !!user?.id,
  });
  
  // Apply selected date range
  const applyDateRange = () => {
    if (startDate && endDate) {
      setCustomDateRange({ start: startDate, end: endDate });
      setShowDateRangePicker(false);
    }
  };
  
  // Function to determine subtitle text based on timeframe
  const getTimeframeSubtitle = () => {
    switch(timeframe) {
      case "Last 30 Days":
        return "Results from the past month";
      case "Last 365 Days":
        return "Results from the past 365 days";
      case "Last Year":
        return "Results from last calendar year";
      case "Last 3 Years":
        return "Results from the past 3 years";
      case "Since Beginning":
        return "All-time results";
      case "This Quarter":
        return "Results from current quarter";
      case "This Year":
        return "Results from current year";
      case "Custom Range":
        return customDateRange.start && customDateRange.end
          ? `Results from ${format(customDateRange.start, 'MMM d, yyyy')} to ${format(customDateRange.end, 'MMM d, yyyy')}`
          : "Select a custom date range";
      default:
        return "Overview of your Six Sigma process improvement initiatives";
    }
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">{getTimeframeSubtitle()}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select
            value={timeframe}
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
              <SelectItem value="Last 365 Days">Last 365 Days</SelectItem>
              <SelectItem value="Last Year">Last Year</SelectItem>
              <SelectItem value="Last 3 Years">Last 3 Years</SelectItem>
              <SelectItem value="Since Beginning">Since Beginning</SelectItem>
              <SelectItem value="This Quarter">This Quarter</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
              <SelectItem value="Custom Range">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={implementationStatus}
            onValueChange={(value) => setImplementationStatus(value as "all" | "implemented" | "not-implemented")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Implementation Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="implemented">Implemented</SelectItem>
              <SelectItem value="not-implemented">Not Implemented</SelectItem>
            </SelectContent>
          </Select>
          
          <Button>
            Export Report
          </Button>
        </div>
      </div>
      
      {/* Custom Date Range Dialog */}
      <Dialog open={showDateRangePicker} onOpenChange={setShowDateRangePicker}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    id="start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    id="end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => (startDate ? date < startDate : false)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={applyDateRange}
              disabled={!startDate || !endDate}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard 
          title="Active Projects"
          value={projects?.projects?.length.toString() || "0"}
          change={0}
          changeLabel={`${implementationStatus === "all" ? "All Projects" : implementationStatus === "implemented" ? "Implemented Projects" : "Not Implemented Projects"}`}
          icon="project-diagram"
          iconBgColor="blue"
        />
        <StatsCard 
          title="Quality Cost Savings (p.a.)"
          value={formatCurrency(calculateMetric(projects?.projects || [], 'qualityCostSavings'), currency)}
          change={implementationStatus === "implemented" ? 25 : implementationStatus === "not-implemented" ? 10 : 22}
          changeLabel={implementationStatus === "all" ? "All projects" : implementationStatus === "implemented" ? "Implemented only" : "Not implemented only"}
          icon="dollar-sign"
          iconBgColor="green"
        />
        <StatsCard 
          title="Working Capital Gains (Cash)"
          value={formatCurrency(calculateMetric(projects?.projects || [], 'workingCapitalGains'), currency)}
          secondaryValue={`Financial Savings (p.a.): ${formatCurrency(calculateMetric(projects?.projects || [], 'financialSavings'), currency)}`}
          change={implementationStatus === "implemented" ? 18 : implementationStatus === "not-implemented" ? 7 : 15}
          changeLabel={implementationStatus === "all" ? "All projects" : implementationStatus === "implemented" ? "Implemented only" : "Not implemented only"} 
          icon="money-bill-wave"
          iconBgColor="indigo"
        />
        <StatsCard 
          title="FTE Benefits"
          value={`${calculateMetric(projects?.projects || [], 'fteBenefits').toFixed(1)} FTE (${formatCurrency(calculateMetric(projects?.projects || [], 'fteValue'), currency)})`}
          change={implementationStatus === "implemented" ? 22 : implementationStatus === "not-implemented" ? 8 : 18}
          changeLabel={implementationStatus === "all" ? "All projects" : implementationStatus === "implemented" ? "Implemented only" : "Not implemented only"}
          icon="user-clock"
          iconBgColor="purple"
        />
      </div>
      
      {/* Project Costs Section */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Project Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">One-off Costs</span>
                  <span className="text-lg font-semibold text-red-600">{formatCurrency(calculateMetric(projects?.projects || [], 'oneOffCosts'), currency)}</span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">People:</span>
                    <span className="font-medium">{formatCurrency(projects?.projects?.reduce((t, p) => t + (p.costs?.oneOffPeopleCost || 0), 0), currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Technology:</span>
                    <span className="font-medium">{formatCurrency(projects?.projects?.reduce((t, p) => t + (p.costs?.oneOffTechnologyCost || 0), 0), currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Others:</span>
                    <span className="font-medium">{formatCurrency(projects?.projects?.reduce((t, p) => t + (p.costs?.oneOffOtherCost || 0), 0), currency)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">OPEX Costs</span>
                  <span className="text-lg font-semibold text-red-600">{formatCurrency(calculateMetric(projects?.projects || [], 'opexCosts'), currency)}</span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">People:</span>
                    <span className="font-medium">{formatCurrency(projects?.projects?.reduce((t, p) => t + (p.costs?.opexPeopleCost || 0), 0), currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Technology:</span>
                    <span className="font-medium">{formatCurrency(projects?.projects?.reduce((t, p) => t + (p.costs?.opexTechnologyCost || 0), 0), currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Others:</span>
                    <span className="font-medium">{formatCurrency(projects?.projects?.reduce((t, p) => t + (p.costs?.opexOtherCost || 0), 0), currency)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">CAPEX Costs</span>
                  <span className="text-lg font-semibold text-red-600">{formatCurrency(calculateMetric(projects?.projects || [], 'capexCosts'), currency)}</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-lg text-red-800">Total Project Costs</div>
                    <div className="font-bold text-xl text-red-800">{formatCurrency(calculateMetric(projects?.projects || [], 'totalCosts'), currency)}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Benefits */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Soft Benefits (Non-Quantifiable)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center mb-2">
                  <i className="fas fa-users text-blue-500 mr-2"></i>
                  <span className="font-medium">Employee Satisfaction</span>
                </div>
                <p className="text-sm text-gray-600">Improved workplace satisfaction through streamlined processes</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center mb-2">
                  <i className="fas fa-award text-amber-500 mr-2"></i>
                  <span className="font-medium">Quality Improvement</span>
                </div>
                <p className="text-sm text-gray-600">Enhanced product and service quality perception</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center mb-2">
                  <i className="fas fa-handshake text-emerald-500 mr-2"></i>
                  <span className="font-medium">Customer Satisfaction</span>
                </div>
                <p className="text-sm text-gray-600">Increased customer satisfaction and loyalty</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center mb-2">
                  <i className="fas fa-puzzle-piece text-purple-500 mr-2"></i>
                  <span className="font-medium">Project Enabler</span>
                </div>
                <p className="text-sm text-gray-600">Enables future projects and improvements to be implemented</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center mb-2">
                  <i className="fas fa-star text-indigo-500 mr-2"></i>
                  <span className="font-medium">Other Benefits</span>
                </div>
                <p className="text-sm text-gray-600">Additional non-quantifiable benefits specific to this project</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts and Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Process Performance</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <i className="fas fa-ellipsis-v"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Download CSV</DropdownMenuItem>
                <DropdownMenuItem>Download Image</DropdownMenuItem>
                <DropdownMenuItem>Share</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={performanceData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Defect Distribution</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <i className="fas fa-ellipsis-v"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Download CSV</DropdownMenuItem>
                <DropdownMenuItem>Download Image</DropdownMenuItem>
                <DropdownMenuItem>Share</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={defectData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb">
                  {defectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`#${(index * 500 + 3000).toString(16)}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Projects / Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Recent Projects</CardTitle>
              <Button variant="link" className="text-primary text-sm p-0">View all</Button>
            </CardHeader>
            <CardContent>
              <ProjectsTable />
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
            <Button variant="link" className="text-primary text-sm p-0">View all</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <ActivityItem 
                type="data-import"
                title="Data Import"
                description="Quality Inspection Process: 243 new records imported"
                time="10 minutes ago"
              />
              
              <ActivityItem 
                type="phase-completed"
                title="Phase Completed"
                description="Order Processing: Measure phase completed"
                time="1 hour ago"
              />
              
              <ActivityItem 
                type="comment"
                title="New Comment"
                description="Lisa added a comment to Inventory Management"
                time="3 hours ago"
              />
              
              <ActivityItem 
                type="alert"
                title="Process Alert"
                description="Quality Inspection Process: Defect rate above threshold"
                time="5 hours ago"
              />
              
              <ActivityItem 
                type="report"
                title="Report Generated"
                description="Monthly process performance report generated"
                time="1 day ago"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
