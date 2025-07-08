import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, LineChart, ScatterChart, Scatter, ZAxis } from "recharts";
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getParetoData } from "@/lib/statisticsUtils";

interface ParetoAnalysisProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  onSave?: (data: string) => void;
}

export function ParetoAnalysis({ projectId, ctqId, ctqName, onSave }: ParetoAnalysisProps) {
// Hypothesis Testing state
    const { toast } = useToast();
    // Correlation Analysis state
    // Sample Pareto data
      const [selectedData, setSelectedData] = useState("Delay Causes");
    
      const rawParetoData = [
        { category: "Documentation Errors", count: 42 },
        { category: "System Downtime", count: 27 },
        { category: "Approval Delays", count: 25 },
        { category: "Others", count: 26 },
      ];
      
      const paretoData = getParetoData(
        rawParetoData.map(d => d.category),
        rawParetoData.map(d => d.count)
      );
      
  
  return (
        <Card>
                <CardHeader>
                  <CardTitle>Pareto Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Identify the vital few causes that account for the majority of problems.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="data-select">Select Data</Label>
                      <Select defaultValue={selectedData} onValueChange={setSelectedData}>
                        <SelectTrigger id="data-select">
                          <SelectValue placeholder="Select data" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Process Defects">Process Defects</SelectItem>
                          <SelectItem value="Customer Complaints">Customer Complaints</SelectItem>
                          <SelectItem value="Delay Causes">Delay Causes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="h-64 border border-gray-200 rounded-md">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={rawParetoData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis yAxisId="left" orientation="left" />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Count" />
                          <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ff7300" name="Cumulative %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative %</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rawParetoData.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm">{item.category}</td>
                              <td className="px-4 py-2 text-sm">{item.count}</td>
                              <td className="px-4 py-2 text-sm">
                                {(item.count / rawParetoData.reduce((sum, i) => sum + i.count, 0) * 100).toFixed(1)}%
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {paretoData.cumulativePercentages[index] ? paretoData.cumulativePercentages[index].toFixed(1) + "%" : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
)}