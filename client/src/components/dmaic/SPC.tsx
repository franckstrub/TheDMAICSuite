import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";

interface SPCProps {
  projectId: number;
  projectType: string;
}

export default function SPC({ projectId, projectType }: SPCProps) {
  const { toast } = useToast();
  // SPC Data state
  const [selectedMetric, setSelectedMetric] = useState("Processing Time");
  
  // Sample SPC data
  const spcData = [
    { date: "Week 1", value: 42, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 2", value: 38, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 3", value: 45, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 4", value: 37, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 5", value: 41, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 6", value: 52, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 7", value: 35, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 8", value: 39, ucl: 60, lcl: 20, centerLine: 40 },
  ];

  const handleDownloadSPC = () => {
    toast({
      title: "Success",
      description: "SPC chart data has been downloaded",
    });
  };

 {/* Statistical Process Control */}
  return (
    <>
    {(projectType === 'Black Belt' || projectType === 'Green Belt') && (
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Statistical Process Control</CardTitle>
          <div className="flex gap-2">
            <Select defaultValue={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Processing Time">Processing Time</SelectItem>
                <SelectItem value="Error Rate">Error Rate</SelectItem>
                <SelectItem value="Customer Satisfaction">Customer Satisfaction</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleDownloadSPC}>
              <i className="fas fa-download mr-1"></i> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Monitor process performance using statistical process control charts.
          </p>
          
          <div className="h-80 border border-gray-200 rounded-md">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={spcData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  name={selectedMetric}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ucl" 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  name="Upper Control Limit"
                />
                <Line 
                  type="monotone" 
                  dataKey="lcl" 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  name="Lower Control Limit"
                />
                <Line 
                  type="monotone" 
                  dataKey="centerLine" 
                  stroke="#10b981" 
                  strokeDasharray="3 3" 
                  name="Center Line"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-gray-500">Current Value</p>
              <p className="text-lg font-semibold">39</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-gray-500">Mean</p>
              <p className="text-lg font-semibold">40</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-gray-500">Standard Deviation</p>
              <p className="text-lg font-semibold">6.67</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-lg font-semibold text-green-600">In Control</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </>
  );
}
