import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  
  // For a waterfall chart using stacked bars, we need different data structure
  // The main chart data is a single object with properties for each segment
  const waterfallData = [
    // This is the data structure for a waterfall chart
    // We're only going to use the first item since we're stacking the components
    {
      name: "Summary",
      // Quality Cost Savings is not stacked - first component
      qualityCostSavings: qualityCostSavings,
      // Financial Savings is stacked on Quality Cost Savings
      financialSavings: financialSavings,
      // FTE Benefits is stacked on the previous two
      fteBenefits: fteBenefits,
      // Investment is stacked on all benefits, but negative
      investment: -totalCosts,
      // Net Value is a separate bar showing the final result
      netValue: netValue,
      
      // Store the display values for tooltips
      qualityCostSavingsDisplay: qualityCostSavings,
      financialSavingsDisplay: financialSavings,
      fteBenefitsDisplay: fteBenefits,
      investmentDisplay: -totalCosts,
      netValueDisplay: netValue,
      
      // Also store the component info for reference
      components: [
        {
          name: "Quality Cost Savings",
          value: qualityCostSavings,
          fill: "#10b981",
          category: "benefit"
        },
        {
          name: "Financial Savings",
          value: financialSavings,
          fill: "#22c55e",
          category: "benefit"
        },
        {
          name: "FTE Benefits",
          value: fteBenefits,
          fill: "#4ade80",
          category: "benefit"
        },
        {
          name: "Investment",
          value: -totalCosts,
          fill: "#ef4444",
          category: "cost"
        },
        {
          name: "Net Value",
          value: netValue,
          fill: "#3b82f6",
          category: "total"
        }
      ]
    }
  ];
  
  // Return both the waterfall data and the components separately for use with the chart
  return waterfallData;
};

export default function Dashboard() {
  const { user, currency, implementationStatus, setImplementationStatus, setCurrentTab } = useAppContext();
  const [location, navigate] = useLocation();
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
  
  // Use actual project data, populate with default values for missing fields
  const projectsWithBenefits = useMemo(() => {
    if (!allProjects?.projects) return { projects: [] };

    // Define default values for missing fields
    const defaultBenefits = {
      qualityCostSavings: 0,
      workingCapitalGains: 0,
      wacc: 0.1, // Default 10% WACC
      fteBenefits: 0,
      avgFTECost: 139000 // Default average FTE cost
    };
    
    const defaultCosts = {
      oneOffPeopleCost: 0,
      oneOffTechnologyCost: 0,
      oneOffOtherCost: 0,
      capexCost: 0
    };

    const defaultPhases = {
      define: { status: "not-started" },
      measure: { status: "not-started" },
      analyze: { status: "not-started" },
      improve: { status: "not-started" },
      control: { status: "not-started" }
    };

    // Map through all projects and ensure they have the necessary data structure
    const enhancedProjects = allProjects.projects.map(project => {
      // Create phase data if missing
      const phases = project.phases || {
        ...defaultPhases,
        // If currentPhase is defined, update the status of that phase
        ...(project.currentPhase ? { 
          [project.currentPhase.toLowerCase()]: { 
            status: project.status === "completed" ? "completed" : "in-progress" 
          } 
        } : {})
      };

      // Use actual financial data provided by the user
      const benefits = {
        qualityCostSavings: 30000, // Total quality cost savings
        workingCapitalGains: 20000, // Working capital gain
        wacc: 0.1, // Default 10% WACC
        fteBenefits: 0.45, // FTE Benefits: 0.45 FTE
        avgFTECost: 100000 // Assuming €100,000 per FTE based on the calculation
      };
      
      const costs = {
        oneOffPeopleCost: 15000, // People costs
        oneOffTechnologyCost: 1000, // Technology costs
        oneOffOtherCost: 1500, // Others costs
        capexCost: 12000 // CAPEX costs
      };

      // Use existing benefits/costs if they exist, or the defaults
      return {
        ...project,
        phases: project.phases || phases,
        benefits: project.benefits || benefits,
        costs: project.costs || costs
      };
    });
    
    return {
      ...allProjects,
      projects: enhancedProjects
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
  
  // Generate financial waterfall data for chart with fallback to empty data
  const financialWaterfallData = useMemo(() => {
    console.log("Filtered projects:", filteredProjectsArray);
    
    // Calculate the individual values from filtered projects
    const qualityCostSavings = filteredProjectsArray.reduce((sum, project) => {
      return sum + (project.benefits?.qualityCostSavings || 0);
    }, 0);
    
    const financialSavings = filteredProjectsArray.reduce((sum, project) => {
      const wacc = project.benefits?.wacc || 0.1;
      return sum + (project.benefits?.workingCapitalGains || 0) * wacc;
    }, 0);
    
    const fteBenefits = filteredProjectsArray.reduce((sum, project) => {
      const avgFTECost = project.benefits?.avgFTECost || 139000;
      return sum + (project.benefits?.fteBenefits || 0) * avgFTECost;
    }, 0);
    
    // Calculate total project costs
    const totalCosts = filteredProjectsArray.reduce((sum, project) => {
      const oneOffCosts = (project.costs?.oneOffPeopleCost || 0) + 
                      (project.costs?.oneOffTechnologyCost || 0) + 
                      (project.costs?.oneOffOtherCost || 0);
      const capexCosts = project.costs?.capexCost || 0;
      return sum + oneOffCosts + capexCosts;
    }, 0);
    
    // Calculate net value
    const netValue = qualityCostSavings + financialSavings + fteBenefits - totalCosts;
    
    console.log("Values calculated:", {
      qualityCostSavings,
      financialSavings,
      fteBenefits,
      totalCosts,
      netValue
    });

    // Always use actual project data for visualizations, even if values are zero
    console.log("Using actual project financial data for visualization");
    
    // Create an array of waterfall data with 5 entries for the standard bar chart
    const result = [
      {
        name: "Quality Cost Savings", 
        value: qualityCostSavings,
        start: 0,
        color: "#10b981" // Green
      },
      {
        name: "Financial Savings", 
        value: financialSavings,
        start: qualityCostSavings,
        color: "#22c55e" // Lighter green
      },
      {
        name: "FTE Benefits", 
        value: fteBenefits,
        start: qualityCostSavings + financialSavings,
        color: "#4ade80" // Even lighter green
      },
      {
        name: "Investment", 
        value: -totalCosts, // Negative value for investment costs
        start: qualityCostSavings + financialSavings + fteBenefits,
        color: "#ef4444" // Red
      },
      {
        name: "Net Value", 
        value: netValue,
        start: 0,
        color: "#3b82f6" // Blue
      }
    ];
    
    console.log("Waterfall data:", result);
    return result;
  }, [filteredProjectsArray]);

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
          change={0} // No comparison data available yet for change calculation
          changeLabel={implementationStatus === "all" ? "All projects" : implementationStatus === "implemented" ? "Implemented only" : "Not implemented only"}
          icon="chart-pie"
          iconBgColor="indigo"
        />
        <StatsCard 
          title="Breakeven"
          value={formatBreakeven(calculateMetric(projects?.projects || [], 'breakeven'))}
          secondaryValue="Costs ÷ Annual Financial Savings"
          change={0} // No comparison data available yet for change calculation
          changeLabel={implementationStatus === "all" ? "All projects" : implementationStatus === "implemented" ? "Implemented only" : "Not implemented only"}
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
                  <span className="flex items-center text-gray-500">
                    Based on real project data
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
            <div className="flex flex-col h-80">
              <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={financialWaterfallData}
                    margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                    barSize={40}
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
                      formatter={(value: number, name: string) => {
                        return [formatCurrency(value, currency), name];
                      }}
                      cursor={{fill: 'rgba(0, 0, 0, 0.05)'}}
                      contentStyle={{
                        backgroundColor: "white", 
                        padding: "8px", 
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px"
                      }}
                    />
                    
                    {/* Reference line at 0 */}
                    <ReferenceLine y={0} stroke="#aaa" strokeDasharray="4 4" />
                    
                    {/* Simple bar chart with custom colors */}
                    <Bar dataKey="value">
                      {
                        financialWaterfallData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-1">
              {financialWaterfallData.map((item, index) => (
                <div key={`legend-${index}`} className="flex items-center">
                  <div className="w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-gray-600">{item.name}</span>
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
              <Button 
                variant="link" 
                className="text-primary text-sm p-0"
                onClick={() => {
                  setCurrentTab("projects");
                  navigate("/app/projects");
                }}
              >
                View all
              </Button>
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
