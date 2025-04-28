import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/store/AppContext";
import StatsCard from "./StatsCard";
import ProjectsTable from "./ProjectsTable";
import ActivityItem from "./ActivityItem";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
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
  const { user } = useAppContext();
  const [timeframe, setTimeframe] = useState("Last 30 Days");

  // Fetch projects - focus on ones created by current user
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects", user?.id],
    enabled: !!user?.id,
  });

  // Fetch activity logs
  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["/api/activity-logs"],
    enabled: !!user?.id,
  });

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of your Six Sigma process improvement initiatives</p>
        </div>
        <div className="flex space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center">
                {timeframe}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTimeframe("Today")}>Today</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeframe("Last 7 Days")}>Last 7 Days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeframe("Last 30 Days")}>Last 30 Days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeframe("This Quarter")}>This Quarter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeframe("This Year")}>This Year</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button>
            Export Report
          </Button>
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard 
          title="Active Projects"
          value="12"
          change={8}
          changeLabel="from last month"
          icon="project-diagram"
          iconBgColor="blue"
        />
        <StatsCard 
          title="Quality Cost Savings (p.a.)"
          value="$842,000"
          change={22}
          changeLabel="YTD"
          icon="dollar-sign"
          iconBgColor="green"
        />
        <StatsCard 
          title="Working Capital Gains (Cash)"
          value="$356,200"
          change={15}
          changeLabel="year-to-date" 
          icon="money-bill-wave"
          iconBgColor="indigo"
        />
        <StatsCard 
          title="Financial Savings (p.a.)"
          value="$35,620"
          change={15}
          changeLabel="year-to-date" 
          icon="percentage"
          iconBgColor="purple"
        />
        <StatsCard 
          title="FTE Benefits"
          value="3.5 FTE ($486,500)"
          change={18}
          changeLabel="year-to-date"
          icon="chart-line"
          iconBgColor="indigo"
        />
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
