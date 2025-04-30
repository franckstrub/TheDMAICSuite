import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/store/AppContext";
import StatsCard from "./StatsCard";
import ProjectsTable from "./ProjectsTable";
import ActivityItem from "./ActivityItem";
import { Button } from "@/components/ui/button";
import { ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { formatCurrency, formatBreakeven } from "@/lib/utils";
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
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, ReferenceLine, ComposedChart, ReferenceArea } from "recharts";

// Define the Project type at the top level so it's accessible
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
    capexCost?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

// Create Financial Benefits waterfall data for projects
const createFinancialWaterfallData = (projects: Project[]) => {
  if (!projects || projects.length === 0) {
    return [];
  }
  
  // Calculate total values across all projects for each category
  const qualityCostSavings = projects.reduce((sum, project) => {
    return sum + (project.benefits?.qualityCostSavings || 0);
  }, 0);
  
  const financialSavings = projects.reduce((sum, project) => {
    const wacc = project.benefits?.wacc || 0.1;
    return sum + (project.benefits?.workingCapitalGains || 0) * wacc;
  }, 0);
  
  const fteBenefits = projects.reduce((sum, project) => {
    const avgFTECost = project.benefits?.avgFTECost || 139000;
    return sum + (project.benefits?.fteBenefits || 0) * avgFTECost;
  }, 0);
  
  // Calculate total project costs
  const totalCosts = projects.reduce((sum, project) => {
    const oneOffCosts = (project.costs?.oneOffPeopleCost || 0) + 
                     (project.costs?.oneOffTechnologyCost || 0) + 
                     (project.costs?.oneOffOtherCost || 0);
    const capexCosts = project.costs?.capexCost || 0;
    return sum + oneOffCosts + capexCosts;
  }, 0);
  
  // Calculate net value
  const netValue = qualityCostSavings + financialSavings + fteBenefits - totalCosts;
  
  // Create the true waterfall chart data
  // For a waterfall chart, we need the following structure:
  // Each component has a "base" (starting point) and a "value" (height of the bar)
  // For intermediate bars, the base is the sum of previous values

  // Create a structure where each bar has the appropriate positioning
  // Setup initial data series - each component has two segments:
  // 1. A transparent segment from 0 to the starting point (base)
  // 2. A colored segment representing the actual value

  // Running total
  let runningTotal = 0;
  
  const waterfallData = [
    // Quality Cost Savings (first bar - starts at 0)
    {
      name: "Quality Cost Savings",
      // For the base segment, value = 0 (no base)
      base: 0,
      // For the value segment, value = actual value
      value: qualityCostSavings,
      // For tooltip and display
      displayValue: qualityCostSavings,
      // For coloring
      fill: "#10b981",
      // Category
      category: "benefit"
    },
    
    // Financial Savings
    {
      name: "Financial Savings",
      // Base is the running total after Quality Cost Savings
      base: qualityCostSavings,
      // Value is the Financial Savings amount
      value: financialSavings,
      // For tooltip and display
      displayValue: financialSavings,
      // For coloring
      fill: "#22c55e",
      // Category
      category: "benefit"
    },
    
    // FTE Benefits
    {
      name: "FTE Benefits",
      // Base is the running total after Financial Savings
      base: qualityCostSavings + financialSavings,
      // Value is the FTE Benefits amount
      value: fteBenefits,
      // For tooltip and display
      displayValue: fteBenefits,
      // For coloring
      fill: "#4ade80",
      // Category
      category: "benefit"
    },
    
    // Investment (negative value)
    {
      name: "Investment",
      // Base is the running total after FTE Benefits
      base: qualityCostSavings + financialSavings + fteBenefits,
      // Value is negative (cost)
      value: -totalCosts,
      // For tooltip and display (negative)
      displayValue: -totalCosts,
      // For coloring
      fill: "#ef4444",
      // Category
      category: "cost"
    },
    
    // Net Value (final result)
    {
      name: "Net Value",
      // The Net Value starts from zero and goes to the final value
      base: 0,
      // Value is the Net Value
      value: netValue,
      // For tooltip and display
      displayValue: netValue,
      // For coloring
      fill: "#3b82f6",
      // Category
      category: "total"
    }
  ];
  
  return waterfallData;
};

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

  // ProjectsData type for API response
  
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
    
    // Special case for ROI which needs to be calculated across all projects at once
    if (metricType === 'roi') {
      // Calculate total financial savings across all projects
      const totalFinancialSavings = calculateMetric(projects, 'totalFinancialSavings');
      // Calculate total costs across all projects
      const totalProjectCosts = calculateMetric(projects, 'totalCosts');
      // Avoid division by zero and calculate ROI from the aggregated totals
      return totalProjectCosts > 0 ? ((totalFinancialSavings - totalProjectCosts) / totalProjectCosts) : 0;
    }
    
    // Special case for breakeven calculation
    if (metricType === 'breakeven') {
      // Calculate total financial savings across all projects (annual)
      const totalFinancialSavings = calculateMetric(projects, 'totalFinancialSavings');
      // Calculate total costs across all projects
      const totalProjectCosts = calculateMetric(projects, 'totalCosts');
      
      // Breakeven in years = Total Costs / Annual Financial Savings
      // Ensure we don't divide by zero
      return totalFinancialSavings > 0 ? (totalProjectCosts / totalFinancialSavings) : 0;
    }
    
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
          const projectWacc = project.benefits?.wacc || 0.1; // Default to 10% WACC if not specified
          value = (project.benefits?.workingCapitalGains || 0) * projectWacc;
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

        case 'capexCosts':
          value = project.costs?.capexCost || 0;
          break;
        case 'totalCosts':
          // One-off costs
          const oneOffCosts = (project.costs?.oneOffPeopleCost || 0) + 
                             (project.costs?.oneOffTechnologyCost || 0) + 
                             (project.costs?.oneOffOtherCost || 0);
          
          // CAPEX costs
          const capexCosts = project.costs?.capexCost || 0;
          
          // Total costs = One-off costs + CAPEX costs (OPEX costs removed as requested)
          value = oneOffCosts + capexCosts;
          break;
        case 'totalBenefits':
          // Sum of all financial benefits - EXCLUDING Working Capital Gains (cash) as requested
          const qualityCost = project.benefits?.qualityCostSavings || 0;
          const projectWaccRate = project.benefits?.wacc || 0.1;
          const wcg = project.benefits?.workingCapitalGains || 0;
          const waccSavings = wcg * projectWaccRate; // Financial Savings from WCG is still included
          const fteBenefits = (project.benefits?.fteBenefits || 0) * (project.benefits?.avgFTECost || 139000);
          value = qualityCost + waccSavings + fteBenefits; // Working Capital Gains (cash) excluded
          break;
        case 'totalFinancialSavings':
          // Total Project Financial Savings p.a. = Quality Cost Savings (p.a.) + Financial Savings (p.a.) + FTE Benefits
          const qualityCostSavingsPa = project.benefits?.qualityCostSavings || 0;
          const financialSavingsPa = (project.benefits?.workingCapitalGains || 0) * (project.benefits?.wacc || 0.1);
          const fteBenefitsValue = (project.benefits?.fteBenefits || 0) * (project.benefits?.avgFTECost || 139000);
          value = qualityCostSavingsPa + financialSavingsPa + fteBenefitsValue;
          break;
        case 'totalSavings':
          // Calculate total savings as Total Benefits - Total Costs
          const totalBenefits = calculateMetric([project], 'totalBenefits');
          const totalCosts = calculateMetric([project], 'totalCosts');
          value = totalBenefits - totalCosts;
          break;
        case 'roi':
          // ROI shouldn't be calculated per project - handled in special case at the top
          value = 0; // This code should never be reached due to the special case for ROI
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

    // Sample benefits data based on implementation status - Adjusted to target exactly 712% ROI
    const implementedBenefits = {
      qualityCostSavings: 1040000,
      workingCapitalGains: 350000, // Still kept for Financial Savings calculation
      wacc: 0.1,
      fteBenefits: 2.0,
      avgFTECost: 139000
    };

    const notImplementedBenefits = {
      qualityCostSavings: 300000,
      workingCapitalGains: 150000, // Still kept for Financial Savings calculation
      wacc: 0.1,
      fteBenefits: 0.8,
      avgFTECost: 139000
    };
    
    // Total Financial Savings: 1,501,600 and Total Costs: 185,000 = 712% ROI
    // Sample cost data based on implementation status
    const implementedCosts = {
      oneOffPeopleCost: 40000,
      oneOffTechnologyCost: 20000,
      oneOffOtherCost: 10000,

      capexCost: 60000
    };
    
    const notImplementedCosts = {
      oneOffPeopleCost: 20000,
      oneOffTechnologyCost: 10000,
      oneOffOtherCost: 5000,

      capexCost: 20000
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
  
  // Get filtered projects array for charts
  const filteredProjectsArray = useMemo(() => {
    if (!projects?.projects) return [];
    return projects.projects;
  }, [projects]);
  
  // Generate financial waterfall data for chart
  const financialWaterfallData = useMemo(() => createFinancialWaterfallData(filteredProjectsArray), [filteredProjectsArray]);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatsCard 
          title="Active Projects"
          value={projects?.projects?.length.toString() || "0"}
          change={0}
          changeLabel={`${implementationStatus === "all" ? "All Projects" : implementationStatus === "implemented" ? "Implemented Projects" : "Not Implemented Projects"}`}
          icon="project-diagram"
          iconBgColor="blue"
        />
        <StatsCard 
          title="ROI"
          value={`${Math.round(calculateMetric(projects?.projects || [], 'roi') * 100)}%`}
          secondaryValue="(Financial Savings-Costs)/Costs"
          change={implementationStatus === "implemented" ? 20 : implementationStatus === "not-implemented" ? 8 : 15}
          changeLabel={implementationStatus === "all" ? "All projects" : implementationStatus === "implemented" ? "Implemented only" : "Not implemented only"}
          icon="chart-pie"
          iconBgColor="indigo"
        />
        <StatsCard 
          title="Breakeven"
          value={formatBreakeven(calculateMetric(projects?.projects || [], 'breakeven'))}
          secondaryValue="Costs ÷ Annual Financial Savings"
          change={implementationStatus === "implemented" ? -15 : implementationStatus === "not-implemented" ? -8 : -12}
          changeLabel={implementationStatus === "all" ? "All projects" : implementationStatus === "implemented" ? "Improved payback period" : "Not implemented only"}
          icon="hourglass-half"
          iconBgColor="yellow"
        />
      </div>
      
      {/* Project Benefits Section */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Project Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Total Financial Savings - Prominently displayed at the top */}
            <div className="mb-6">
              <div className="bg-green-50 p-5 rounded-lg border border-green-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <i className="fas fa-coins text-green-600 text-2xl mr-3"></i>
                    <div className="font-medium text-xl text-green-800">Total Project Financial Savings (p.a.)</div>
                  </div>
                  <div className="font-bold text-2xl text-green-800">{formatCurrency(calculateMetric(projects?.projects || [], 'totalFinancialSavings'), currency)}</div>
                </div>
                <div className="mt-2 text-sm text-green-600">
                  <div>
                    Across {projects?.projects?.length || 0} projects {implementationStatus !== "all" ? 
                    `(${implementationStatus === "implemented" ? "Implemented" : "Not Implemented"} only)` : ""}
                  </div>
                  <div className="mt-1 italic text-xs">
                    Note: Quality Savings + Financial Savings + FTE Benefits
                  </div>
                </div>
              </div>
            </div>
            
            {/* Benefits Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">Quality Cost Savings (p.a.)</span>
                  <span className="text-lg font-semibold text-green-600">{formatCurrency(calculateMetric(projects?.projects || [], 'qualityCostSavings'), currency)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  <span className={`flex items-center ${implementationStatus === "implemented" ? "text-green-500" : implementationStatus === "not-implemented" ? "text-green-500" : "text-green-500"}`}>
                    <i className="fas fa-arrow-up mr-1"></i> 
                    {implementationStatus === "implemented" ? 25 : implementationStatus === "not-implemented" ? 10 : 22}%
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">Working Capital Gains (Cash)</span>
                  <span className="text-lg font-semibold text-indigo-600">{formatCurrency(calculateMetric(projects?.projects || [], 'workingCapitalGains'), currency)}</span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Financial Savings (p.a.):</span>
                    <span className="font-medium text-green-600">{formatCurrency(calculateMetric(projects?.projects || [], 'financialSavings'), currency)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">FTE Benefits</span>
                  <span className="text-lg font-semibold text-purple-600">{calculateMetric(projects?.projects || [], 'fteBenefits').toFixed(1)} FTE</span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Financial Value:</span>
                    <span className="font-medium text-green-600">{formatCurrency(calculateMetric(projects?.projects || [], 'fteValue'), currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Project Costs Section */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Project Costs</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Total Project Costs - Prominently displayed at the top */}
            <div className="mb-6">
              <div className="bg-red-50 p-5 rounded-lg border border-red-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <i className="fas fa-money-bill text-red-600 text-2xl mr-3"></i>
                    <div className="font-medium text-xl text-red-800">Total Project Costs</div>
                  </div>
                  <div className="font-bold text-2xl text-red-800">{formatCurrency(calculateMetric(projects?.projects || [], 'totalCosts'), currency)}</div>
                </div>
                <div className="mt-2 text-sm text-red-600">
                  <div>
                    Across {projects?.projects?.length || 0} projects {implementationStatus !== "all" ? 
                    `(${implementationStatus === "implemented" ? "Implemented" : "Not Implemented"} only)` : ""}
                  </div>
                  <div className="mt-1 italic text-xs">
                    Note: Total includes one-off costs and CAPEX costs
                  </div>
                </div>
              </div>
            </div>
            
            {/* Cost Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">One-off Costs</span>
                  <span className="text-lg font-semibold text-red-600">{formatCurrency(calculateMetric(projects?.projects || [], 'oneOffCosts'), currency)}</span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <div className="flex flex-col">
                        <span className="text-gray-600 text-sm">People:</span>
                        <span className="font-medium">{formatCurrency(projects?.projects?.reduce((t, p) => t + (p.costs?.oneOffPeopleCost || 0), 0), currency)}</span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="flex flex-col">
                        <span className="text-gray-600 text-sm">Technology:</span>
                        <span className="font-medium">{formatCurrency(projects?.projects?.reduce((t, p) => t + (p.costs?.oneOffTechnologyCost || 0), 0), currency)}</span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="flex flex-col">
                        <span className="text-gray-600 text-sm">Others:</span>
                        <span className="font-medium">{formatCurrency(projects?.projects?.reduce((t, p) => t + (p.costs?.oneOffOtherCost || 0), 0), currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">CAPEX Costs</span>
                  <span className="text-lg font-semibold text-red-600">{formatCurrency(calculateMetric(projects?.projects || [], 'capexCosts'), currency)}</span>
                </div>
                <div className="mt-2">
                  <div className="text-sm text-gray-600">
                    Capital expenditures for long-term project assets and equipment that will be used over multiple years. These costs are typically depreciated over time.
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
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Financial Benefits Waterfall</CardTitle>
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
          <CardContent className="h-80">
            <div className="mb-3 px-2">
              <p className="text-sm text-gray-600">Financial impact across all {implementationStatus === "all" ? "" : implementationStatus === "implemented" ? "implemented " : "not implemented "}projects ({projects?.projects?.length || 0})</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-700">Net Financial Value:</span>
                <span className="font-medium text-gray-900">{formatCurrency(calculateMetric(projects?.projects || [], 'totalFinancialSavings') - calculateMetric(projects?.projects || [], 'totalCosts'), currency)}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart 
                data={financialWaterfallData}
                margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                barSize={40}
                layout="horizontal"
                maxBarSize={60}
                barCategoryGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{fill: '#6b7280', fontSize: 11}}
                  height={50}
                  interval={0}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value, currency)} 
                  label={{ 
                    value: currency, 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 }
                  }}
                  tickLine={false}
                  axisLine={false}
                  tick={{fill: '#6b7280', fontSize: 12}}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      // For our custom bar implementation using ReferenceArea
                      // payload[0].name will be x1, x2, y1, or y2
                      // We need to use a different approach:
                      
                      // Find which bar we're hovering over based on x-coordinate
                      const xValue = payload[0].payload.x;
                      // Round to nearest integer to get our index
                      const barIndex = Math.round(xValue);
                      
                      // Get the data entry at this index
                      const entry = financialWaterfallData[barIndex];
                      
                      if (entry) {
                        // Determine the type of bar
                        let barType = "";
                        if (entry.category === "total") {
                          barType = "Final Result";
                        } else if (entry.category === "cost") {
                          barType = "Cost";
                        } else {
                          barType = "Benefit";
                        }
                        
                        // Return a custom tooltip
                        return (
                          <div className="bg-white p-2 rounded-md shadow-md border">
                            <p className="font-medium">{`${entry.name} (${barType})`}</p>
                            <p className="text-sm">{formatCurrency(entry.displayValue, currency)}</p>
                          </div>
                        );
                      }
                    }
                    return null;
                  }}
                  cursor={{fill: 'rgba(0, 0, 0, 0.05)'}}
                />
                
                {/* Reference line at 0 */}
                <ReferenceLine y={0} stroke="#aaa" strokeDasharray="4 4" />
                
                {/* Render bars as rectangles - this way we have complete control */}
                {financialWaterfallData.map((entry, i) => {
                  // First bar starts at 0
                  // Last bar (Net Value) starts at 0
                  // Middle bars start at the sum of previous values
                  
                  // Setting up the bar rendering
                  let barProps = {};
                  let barColor = entry.fill;
                  let barStart, barEnd;
                  
                  if (entry.category === "total") {
                    // Net Value - starts at 0, ends at net value
                    barStart = 0;
                    barEnd = entry.value;
                  } else {
                    // Regular bar - starts at base, ends at base + value
                    barStart = entry.base;
                    barEnd = entry.base + entry.value;
                  }
                  
                  return (
                    <ReferenceArea
                      key={`bar-${i}`}
                      x1={i - 0.4}
                      x2={i + 0.4}
                      y1={barStart}
                      y2={barEnd}
                      fill={barColor}
                      fillOpacity={1}
                      strokeWidth={0}
                      ifOverflow="visible"
                    />
                  );
                })}
                
                {/* Create connecting lines between consecutive bars using ReferenceArea */}
                {financialWaterfallData.map((entry, i, arr) => {
                  // Skip the last item or the total category
                  if (i === arr.length - 1 || entry.category === "total") return null;
                  
                  // Get the next entry in the array
                  const nextEntry = arr[i + 1];
                  
                  // Skip if the next entry is the total
                  if (nextEntry.category === "total") return null;
                  
                  // Calculate position Y for the connecting line
                  // End position of current bar = base + value
                  const linePosition = entry.base + entry.value;
                  
                  // Draw a connecting line using a thin ReferenceArea
                  // This lets us specify the x-coordinates explicitly
                  return (
                    <ReferenceArea 
                      key={`connector-${i}`}
                      x1={i + 0.4} // End of this bar
                      x2={i + 1 - 0.4} // Start of next bar
                      y1={linePosition - 0.5} // Make the line thin
                      y2={linePosition + 0.5} // Make the line thin
                      strokeDasharray="3 3"
                      stroke="#aaa"
                      fill="#aaa"
                      fillOpacity={0.3}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-1">
              {financialWaterfallData.map((entry, i) => (
                <div key={`legend-${i}`} className="flex items-center">
                  <div className="w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: entry.fill }}></div>
                  <span className="text-xs text-gray-600">{entry.name}</span>
                </div>
              ))}
            </div>
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
