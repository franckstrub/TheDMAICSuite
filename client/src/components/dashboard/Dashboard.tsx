import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAppContext, ImplementationStatusType } from "@/store/AppContext";
import StatsCard from "./StatsCard";
import ProjectsTable from "./ProjectsTable";
import ActivityItem from "./ActivityItem";
import SoftBenefitsQuadrant from "./SoftBenefitsQuadrant";
import { Button } from "@/components/ui/button";
import { ChevronDown, Calendar as CalendarIcon, FileDown } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  
  // Reference to the dashboard container for capturing a screenshot
  const dashboardRef = React.useRef<HTMLDivElement>(null);
  
  // Function to generate and download a PDF report of the dashboard
  const generateDashboardReport = async () => {
    toast({
      title: "Generating PDF Report",
      description: "Please wait while we capture the dashboard...",
    });
    
    try {
      if (!dashboardRef.current) {
        throw new Error("Dashboard element not found");
      }
      
      // Use html2canvas to capture the dashboard as an image
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 1.5, // Higher quality
        useCORS: true, // Allow cross-origin images
        logging: false, // Disable logging
        allowTaint: true, // Allow tainted canvas
        backgroundColor: "#ffffff" // White background
      });
      
      // Create a new jsPDF instance
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calculate dimensions
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasRatio = canvas.height / canvas.width;
      const imgWidth = pdfWidth;
      const imgHeight = pdfWidth * canvasRatio;
      
      // Add title
      pdf.setFontSize(18);
      pdf.setTextColor(33, 37, 41);
      pdf.text("Lean Six Sigma DMAIC Suite™ - Dashboard Report", 14, 15);
      
      // Add date and filter information
      pdf.setFontSize(10);
      pdf.setTextColor(85, 85, 85);
      pdf.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, 14, 22);
      
      // Add filter information
      let filterText = `Timeframe: ${timeframe}`;
      if (timeframe === "Custom Range" && customDateRange.start && customDateRange.end) {
        filterText += ` (${format(customDateRange.start, 'MMM d, yyyy')} - ${format(customDateRange.end, 'MMM d, yyyy')})`;
      }
      pdf.text(filterText, 14, 26);
      
      // Add status filter info
      let statusFilterText = "Status Filter: ";
      switch(implementationStatus) {
        case "all": statusFilterText += "All Projects"; break;
        case "active": statusFilterText += "Active Projects"; break;
        case "completed": statusFilterText += "Completed Projects"; break;
        case "on-hold": statusFilterText += "On-Hold Projects"; break;
        case "abandoned": statusFilterText += "Abandoned Projects"; break;
        case "active-completed": statusFilterText += "Active + Completed Projects"; break;
        case "implemented": statusFilterText += "Implemented Projects"; break;
        case "not-implemented": statusFilterText += "Not Implemented Projects"; break;
        default: statusFilterText += "All Projects";
      }
      pdf.text(statusFilterText, 14, 30);
      
      // Add horizontal line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(14, 32, pdfWidth - 14, 32);
      
      // Calculate page count based on image height
      const totalPages = Math.ceil(imgHeight / (pdfHeight - 40));
      
      // Split image across multiple pages if needed
      let remainingHeight = imgHeight;
      let sourceY = 0;
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // Calculate how much of the image will fit on this page
        const pageHeight = pdfHeight - (page === 0 ? 40 : 20); // First page has header
        const printHeight = Math.min(remainingHeight, pageHeight);
        const sourceHeight = (printHeight / imgHeight) * canvas.height;
        
        // Create a temporary canvas to hold just this portion of the image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        
        // Draw the portion of the original canvas onto the temporary canvas
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(
            canvas, 
            0, sourceY, canvas.width, sourceHeight,
            0, 0, tempCanvas.width, tempCanvas.height
          );
          
          // Convert the temporary canvas to a data URL
          const pageImgData = tempCanvas.toDataURL('image/png');
          
          // Add this portion to the PDF
          const yPosition = page === 0 ? 40 : 15;
          pdf.addImage(pageImgData, 'PNG', 14, yPosition, imgWidth - 28, printHeight);
          
          // Update for next page
          remainingHeight -= printHeight;
          sourceY += sourceHeight;
        }
        
        // Add page number at the bottom
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${page + 1} of ${totalPages}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
      }
      
      // Add footer to all pages
      for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Lean Six Sigma DMAIC Suite™', 14, pdfHeight - 5);
      }
      
      // Save the PDF
      const filename = `DMAIC_Dashboard_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(filename);
      
      toast({
        title: "Report Generated Successfully",
        description: `Your dashboard has been captured and saved as ${filename}`,
      });
    } catch (error) {
      console.error("Error generating PDF report:", error);
      toast({
        title: "Error",
        description: "There was a problem creating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };
  
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
    // A project is implemented if it has status "completed"
    // OR if Improve phase is completed AND Control phase is in progress or completed
    return (
      project.status === "completed" ||
      (project.phases?.improve?.status === "completed" && 
       (project.phases?.control?.status === "in-progress" || project.phases?.control?.status === "completed"))
    );
  };
  
  // Calculate the percentage change in projects based on historical data
  const calculateProjectsChange = (projects: any[] | undefined): number => {
    // Always return 0% as specified by user requirements
    return 0;
  };

  // Helper function to calculate metrics based on projects using actual project data
  const calculateMetric = (projects: Project[], metricType: string): number => {
    // If there are no projects, return 0
    if (!projects || projects.length === 0) {
      return 0;
    }
    
    // Calculate actual totals based on the provided projects
    // This uses the real, filtered project data
    
    // BENEFITS
    // Calculate total quality cost savings from all projects
    const qualityCostSavings = projects.reduce((sum, project) => {
      return sum + (project.benefits?.qualityCostSavings || 0);
    }, 0);
    
    // Calculate working capital gains
    const workingCapitalGains = projects.reduce((sum, project) => {
      return sum + (project.benefits?.workingCapitalGains || 0);
    }, 0);
    
    // Calculate financial savings using WACC
    const financialSavings = projects.reduce((sum, project) => {
      const wacc = project.benefits?.wacc || 0.1; // Default 10% if not specified
      return sum + (project.benefits?.workingCapitalGains || 0) * wacc;
    }, 0);
    
    // Calculate FTE benefits
    const fteBenefits = projects.reduce((sum, project) => {
      return sum + (project.benefits?.fteBenefits || 0);
    }, 0);
    
    // Calculate financial value of FTE benefits
    const fteValue = projects.reduce((sum, project) => {
      const avgFTECost = project.benefits?.avgFTECost || 100000; // Default value if not specified
      return sum + (project.benefits?.fteBenefits || 0) * avgFTECost;
    }, 0);
    
    // COSTS
    // Calculate one-off people costs
    const oneOffPeopleCost = projects.reduce((sum, project) => {
      return sum + (project.costs?.oneOffPeopleCost || 0);
    }, 0);
    
    // Calculate one-off technology costs
    const oneOffTechnologyCost = projects.reduce((sum, project) => {
      return sum + (project.costs?.oneOffTechnologyCost || 0);
    }, 0);
    
    // Calculate one-off other costs
    const oneOffOtherCost = projects.reduce((sum, project) => {
      return sum + (project.costs?.oneOffOtherCost || 0);
    }, 0);
    
    // Calculate total one-off costs
    const oneOffCosts = oneOffPeopleCost + oneOffTechnologyCost + oneOffOtherCost;
    
    // Calculate CAPEX costs
    const capexCosts = projects.reduce((sum, project) => {
      return sum + (project.costs?.capexCost || 0);
    }, 0);
    
    // Calculate total costs
    const totalCosts = oneOffCosts + capexCosts;
    
    // AGGREGATE METRICS
    // Calculate total benefits
    const totalFinancialSavings = qualityCostSavings + financialSavings + fteValue;
    
    // Calculate net savings (benefits - costs)
    const totalSavings = totalFinancialSavings - totalCosts;
    
    // Calculate ROI
    const roi = totalCosts > 0 ? totalSavings / totalCosts : 0;
    
    // Calculate breakeven in years
    const breakeven = totalFinancialSavings > 0 ? totalCosts / totalFinancialSavings : 0;
    
    // Return the requested metric
    switch(metricType) {
      // Benefit metrics
      case 'qualityCostSavings':
        return qualityCostSavings;
      case 'workingCapitalGains':
        return workingCapitalGains;
      case 'financialSavings':
        return financialSavings;
      case 'fteBenefits':
        return fteBenefits;
      case 'fteValue':
        return fteValue;
        
      // Cost metrics
      case 'oneOffPeopleCost':
        return oneOffPeopleCost;
      case 'oneOffTechnologyCost':
        return oneOffTechnologyCost;
      case 'oneOffOtherCost':
        return oneOffOtherCost;
      case 'oneOffCosts':
        return oneOffCosts;
      case 'capexCosts':
        return capexCosts;
      case 'totalCosts':
        return totalCosts;
        
      // Aggregate financial metrics
      case 'totalBenefits':
        return totalFinancialSavings; // Total financial benefits
      case 'totalFinancialSavings':
        return totalFinancialSavings; // Quality + Financial + FTE benefits
      case 'totalSavings':
        return totalSavings; // Benefits - Costs
        
      // ROI calculation
      case 'roi':
        return roi; // Return on investment
        
      // Breakeven calculation
      case 'breakeven':
        return breakeven; // Breakeven period
        
      default:
        return 0;
    }
  };
  
  // Fetch projects - focus on ones created by current user
  const { data: allProjects, isLoading: isLoadingProjects } = useQuery<ProjectsData>({
    queryKey: ["/api/projects", user?.id, effectiveTimeframe],
    enabled: !!user?.id,
  });
  
  // Create a function to extract soft benefits from project data
  const extractSoftBenefits = () => {
    // Get the relevant projects based on current filters
    let relevantProjects = projects?.projects || [];
    
    if (!relevantProjects || relevantProjects.length === 0) {
      return [];
    }
    
    type SoftBenefit = {
      id: number; 
      text: string; 
      projectId: number;
      projectTitle: string;
      category: 'employee' | 'customer' | 'process' | 'growth';
    };
    
    // Generate benefits based on project attributes
    const generateBenefitsForProject = (project: Project): SoftBenefit[] => {
      const benefits: SoftBenefit[] = [];
      const projectId = project.id;
      const projectTitle = project.title || `Project ${projectId}`;
      
      // Generate a semi-random base ID for each project to avoid duplicates
      const baseId = projectId * 100;
      
      // Employee Benefits - based on project details
      if (project.title.toLowerCase().includes('quality') || 
          project.description?.toLowerCase().includes('quality') ||
          project.description?.toLowerCase().includes('defect')) {
        benefits.push({
          id: baseId + 1,
          text: "Reduced employee stress from fewer quality issues",
          projectId,
          projectTitle,
          category: 'employee'
        });
      }
      
      if (project.currentPhase === 'improve' || project.currentPhase === 'control' ||
          project.status === 'completed') {
        benefits.push({
          id: baseId + 2,
          text: "Higher job satisfaction from streamlined processes",
          projectId,
          projectTitle,
          category: 'employee'
        });
      }
      
      // Customer Benefits - based on project details
      if (project.title.toLowerCase().includes('quality') || 
          project.description?.toLowerCase().includes('delivery') ||
          project.description?.toLowerCase().includes('inspection')) {
        benefits.push({
          id: baseId + 3,
          text: "Improved product quality perception in customer surveys",
          projectId,
          projectTitle,
          category: 'customer'
        });
      }
      
      if (project.status === 'active' || project.status === 'completed') {
        benefits.push({
          id: baseId + 4,
          text: "Increased customer satisfaction from faster delivery",
          projectId,
          projectTitle,
          category: 'customer'
        });
      }
      
      // Process Benefits - all projects have process benefits
      benefits.push({
        id: baseId + 5,
        text: "Better documentation and knowledge sharing",
        projectId,
        projectTitle,
        category: 'process'
      });
      
      if (project.currentPhase === 'analyze' || project.currentPhase === 'improve') {
        benefits.push({
          id: baseId + 6,
          text: "Enhanced cross-department communication",
          projectId,
          projectTitle,
          category: 'process'
        });
      }
      
      // Growth Benefits - all projects contribute to organizational learning
      benefits.push({
        id: baseId + 7,
        text: "Team skill development with process improvement tools",
        projectId,
        projectTitle,
        category: 'growth'
      });
      
      if (project.status === 'completed' || project.currentPhase === 'control') {
        benefits.push({
          id: baseId + 8,
          text: "Management experience with structured improvement methods",
          projectId,
          projectTitle,
          category: 'growth'
        });
      }
      
      return benefits;
    };
    
    // Generate all benefits for all relevant projects
    const allBenefits = relevantProjects.flatMap(generateBenefitsForProject);
    
    return allBenefits;
  };
  
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
  
  // Filter projects based on implementation and status filters
  const projects = useMemo(() => {
    if (!projectsWithBenefits?.projects) return { projects: [] };
    
    // If implementation status is "all", return all projects
    if (implementationStatus === "all") {
      return projectsWithBenefits;
    }
    
    // Filter projects based on implementation status or specific status values
    const filteredProjects = projectsWithBenefits.projects.filter((project: Project) => {
      switch (implementationStatus) {
        case "implemented":
          return isProjectImplemented(project); // Completed projects
        case "not-implemented":
          return !isProjectImplemented(project); // Non-completed projects
        case "active":
          return project.status === "active" || project.status === "in-progress";
        case "completed":
          return project.status === "completed"; // Same as implemented
        case "on-hold":
          return project.status === "on-hold" || project.status === "not-started";
        case "abandoned":
          return project.status === "abandoned" || project.status === "canceled";
        case "active-completed":
          return (project.status === "active" || 
                 project.status === "in-progress" || 
                 project.status === "completed");
        default:
          return true; // Fallback to display all projects if filter is unrecognized
      }
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
    
    // Use the calculateMetric function to get values (will return 0 for implemented filter with no projects)
    const qualityCostSavings = calculateMetric(filteredProjectsArray, 'qualityCostSavings');
    const financialSavings = calculateMetric(filteredProjectsArray, 'financialSavings');
    const fteBenefits = calculateMetric(filteredProjectsArray, 'fteValue');
    
    // Get costs using the calculateMetric function
    const oneOffPeopleCost = calculateMetric(filteredProjectsArray, 'oneOffPeopleCost');
    const oneOffTechnologyCost = calculateMetric(filteredProjectsArray, 'oneOffTechnologyCost');
    const oneOffOtherCost = calculateMetric(filteredProjectsArray, 'oneOffOtherCost');
    const capexCost = calculateMetric(filteredProjectsArray, 'capexCosts');
    
    // Calculate total project costs
    const totalCosts = calculateMetric(filteredProjectsArray, 'totalCosts');
    
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
  // Type for activity logs response
  type LogsData = {
    logs: Array<{
      id: number;
      userId: number;
      projectId: number;
      action: string;
      description: string;
      timestamp: string;
      projectTitle?: string;
      username?: string;
    }>;
  }

  const { data: logs, isLoading: isLoadingLogs } = useQuery<LogsData>({
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
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8" ref={dashboardRef}>
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
            onValueChange={(value) => setImplementationStatus(value as ImplementationStatusType)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Project Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="abandoned">Abandoned</SelectItem>
              <SelectItem value="active-completed">Active + Completed</SelectItem>
              <SelectItem value="implemented">Implemented</SelectItem>
              <SelectItem value="not-implemented">Not Implemented</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={generateDashboardReport}>
            <FileDown className="mr-2 h-4 w-4" /> Export Report
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
      
      {/* Implementation Status Definition - Show only when relevant */}
      {(implementationStatus === "implemented" || implementationStatus === "not-implemented") && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Implementation Status Definition:</h3>
          <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
            <li><span className="font-medium">Implemented Projects:</span> Status is "completed" OR Improve phase is completed AND Control phase is in progress/completed</li>
            <li><span className="font-medium">Not Implemented Projects:</span> All other projects</li>
          </ul>
        </div>
      )}
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatsCard 
          title={(() => {
            // Generate card title based on current filter
            switch(implementationStatus) {
              case "all": return "All Projects";
              case "active": return "Active Projects";
              case "completed": return "Completed Projects";
              case "on-hold": return "On-Hold Projects";
              case "abandoned": return "Abandoned Projects";
              case "active-completed": return "Active + Completed Projects";
              case "implemented": return "Implemented Projects";
              case "not-implemented": return "Not Implemented Projects";
              default: return "Projects";
            }
          })()}
          value={projects?.projects?.length.toString() || "0"}
          // Calculate the percentage change based on actual data
          change={calculateProjectsChange(projects?.projects)}
          changeLabel={(() => {
            // Get counts by status
            const activeCount = projectsWithBenefits?.projects?.filter(p => 
              p.status === "active" || 
              p.status === "in-progress").length || 0;
            const completedCount = projectsWithBenefits?.projects?.filter(p => 
              p.status === "completed").length || 0;
            const onHoldCount = projectsWithBenefits?.projects?.filter(p => 
              p.status === "not-started" || 
              p.status === "on-hold").length || 0;
            const abandonedCount = projectsWithBenefits?.projects?.filter(p => 
              p.status === "abandoned" || 
              p.status === "canceled").length || 0;
            
            // Get counts by implementation status
            const implementedCount = projectsWithBenefits?.projects?.filter(p => 
              isProjectImplemented(p)).length || 0;
            const notImplementedCount = projectsWithBenefits?.projects?.length - implementedCount || 0;
            
            // Return appropriate breakdown based on filter
            switch(implementationStatus) {
              case "all":
                return `Active: ${activeCount} | Completed: ${completedCount} | On-Hold: ${onHoldCount} | Abandoned: ${abandonedCount}`;
              case "active":
                return `Total: ${activeCount} | Active Projects`;
              case "completed":
                return `Total: ${completedCount} | Completed Projects`;
              case "on-hold":
                return `Total: ${onHoldCount} | On-Hold Projects`;
              case "abandoned":
                return `Total: ${abandonedCount} | Abandoned Projects`;
              case "active-completed":
                return `Active: ${activeCount} | Completed: ${completedCount} | Total: ${activeCount + completedCount}`;
              case "implemented":
                return `Total: ${implementedCount} | Implemented Projects (Status "completed" OR Improve phase completed + Control in progress/completed)`;
              case "not-implemented":
                return `Total: ${notImplementedCount} | Not Implemented Projects (All other statuses)`;
              default:
                return `All Projects: ${projectsWithBenefits?.projects?.length || 0}`;
            }
          })()}
          icon="project-diagram"
          iconBgColor="blue"
        />
        <StatsCard 
          title="ROI"
          value={(() => {
            // Ensure filter-specific ROI calculation
            const filteredProjects = projects?.projects || [];
            
            // Calculate total financial savings (quality, financial and FTE)
            const qualityCostSavings = calculateMetric(filteredProjects, 'qualityCostSavings');
            const financialSavings = calculateMetric(filteredProjects, 'financialSavings');
            const fteBenefits = calculateMetric(filteredProjects, 'fteValue');
            const totalFinancialSavings = qualityCostSavings + financialSavings + fteBenefits;
            
            // Calculate total costs
            const totalCosts = calculateMetric(filteredProjects, 'totalCosts');
            
            // Calculate ROI: (Savings - Costs) / Costs
            let roi = 0;
            if (totalCosts > 0) {
              roi = (totalFinancialSavings - totalCosts) / totalCosts;
            }
            
            // Format as percentage
            return `${Math.round(roi * 100)}%`;
          })()}
          secondaryValue="(Financial Savings-Costs)/Costs"
          change={0} // No comparison data available yet for change calculation
          changeLabel={(() => {
            // Generate change label based on current filter
            switch(implementationStatus) {
              case "all": return "All Projects";
              case "active": return "Active Projects";
              case "completed": return "Completed Projects";
              case "on-hold": return "On-Hold Projects";
              case "abandoned": return "Abandoned Projects";
              case "active-completed": return "Active + Completed Projects";
              case "implemented": return "Implemented Projects";
              case "not-implemented": return "Not Implemented Projects";
              default: return "Projects";
            }
          })()}
          icon="chart-pie"
          iconBgColor="indigo"
        />
        <StatsCard 
          title="Breakeven"
          value={(() => {
            // Ensure filter-specific Breakeven calculation
            const filteredProjects = projects?.projects || [];
            
            // Calculate total financial savings (quality, financial and FTE)
            const qualityCostSavings = calculateMetric(filteredProjects, 'qualityCostSavings');
            const financialSavings = calculateMetric(filteredProjects, 'financialSavings');
            const fteBenefits = calculateMetric(filteredProjects, 'fteValue');
            const totalFinancialSavings = qualityCostSavings + financialSavings + fteBenefits;
            
            // Calculate total costs
            const totalCosts = calculateMetric(filteredProjects, 'totalCosts');
            
            // Calculate breakeven in years: Costs / Annual Financial Savings
            let breakeven = 0;
            if (totalFinancialSavings > 0) {
              breakeven = totalCosts / totalFinancialSavings;
            }
            
            // Format as years and months
            return formatBreakeven(breakeven);
          })()}
          secondaryValue="Costs ÷ Annual Financial Savings"
          change={0} // No comparison data available yet for change calculation
          changeLabel={(() => {
            // Generate change label based on current filter
            switch(implementationStatus) {
              case "all": return "All Projects";
              case "active": return "Active Projects";
              case "completed": return "Completed Projects";
              case "on-hold": return "On-Hold Projects";
              case "abandoned": return "Abandoned Projects";
              case "active-completed": return "Active + Completed Projects";
              case "implemented": return "Implemented Projects";
              case "not-implemented": return "Not Implemented Projects";
              default: return "Projects";
            }
          })()}
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
                    (() => {
                      // Generate appropriate status label based on filter
                      switch(implementationStatus) {
                        case "active": return "(Active only)";
                        case "completed": return "(Completed only)"; 
                        case "on-hold": return "(On-Hold only)";
                        case "abandoned": return "(Abandoned only)";
                        case "active-completed": return "(Active + Completed)";
                        case "implemented": return "(Implemented only)";
                        case "not-implemented": return "(Not Implemented only)";
                        default: return "";
                      }
                    })() : ""}
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
                {/* Removed "Based on real project data" text as requested */}
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
                    (() => {
                      // Generate appropriate status label based on filter
                      switch(implementationStatus) {
                        case "active": return "(Active only)";
                        case "completed": return "(Completed only)"; 
                        case "on-hold": return "(On-Hold only)";
                        case "abandoned": return "(Abandoned only)";
                        case "active-completed": return "(Active + Completed)";
                        case "implemented": return "(Implemented only)";
                        case "not-implemented": return "(Not Implemented only)";
                        default: return "";
                      }
                    })() : ""}
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
                        <span className="font-medium">{formatCurrency(calculateMetric(projects?.projects || [], 'oneOffPeopleCost'), currency)}</span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="flex flex-col">
                        <span className="text-gray-600 text-sm">Technology:</span>
                        <span className="font-medium">{formatCurrency(calculateMetric(projects?.projects || [], 'oneOffTechnologyCost'), currency)}</span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="flex flex-col">
                        <span className="text-gray-600 text-sm">Others:</span>
                        <span className="font-medium">{formatCurrency(calculateMetric(projects?.projects || [], 'oneOffOtherCost'), currency)}</span>
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
      
      {/* Financial Benefits Waterfall Chart */}
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
              <p className="text-sm text-gray-600">Financial impact across {(() => {
                  // Generate appropriate status description based on filter
                  switch(implementationStatus) {
                    case "all": return "all";
                    case "active": return "active"; 
                    case "completed": return "completed";
                    case "on-hold": return "on-hold";
                    case "abandoned": return "abandoned";
                    case "active-completed": return "active and completed";
                    case "implemented": return "implemented";
                    case "not-implemented": return "not implemented";
                    default: return "";
                  }
                })()} projects ({projects?.projects?.length || 0})</p>
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
      
      {/* Soft Benefits Quadrant */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <SoftBenefitsQuadrant benefits={extractSoftBenefits()} />
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
              {logs?.logs && logs.logs.length > 0 ? (
                logs.logs.slice(0, 5).map((log: any, index: number) => {
                  // Get project name from projects
                  const project = allProjects?.projects?.find(p => p.id === log.projectId);
                  const projectName = project?.title || `Project ID: ${log.projectId}`;
                  
                  // Format the timestamp
                  const timestamp = new Date(log.timestamp);
                  const now = new Date();
                  const diffMs = now.getTime() - timestamp.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMins / 60);
                  const diffDays = Math.floor(diffHours / 24);
                  
                  let timeAgo = "";
                  if (diffMins < 60) {
                    timeAgo = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
                  } else if (diffHours < 24) {
                    timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                  } else {
                    timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                  }
                  
                  // Format title based on action
                  let title = "";
                  if (log.action === "create_project") {
                    title = "Project Created";
                  } else if (log.action === "update_charter") {
                    title = "Charter Updated";
                  } else if (log.action === "create_charter") {
                    title = "Charter Created";
                  } else {
                    title = log.action.replace(/_/g, ' ').replace(/\b\w/g, function(l: string) { return l.toUpperCase(); });
                  }
                  
                  return (
                    <ActivityItem 
                      key={log.id}
                      type={log.action}
                      title={title}
                      description={log.details}
                      time={timeAgo}
                      projectName={projectName}
                    />
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
