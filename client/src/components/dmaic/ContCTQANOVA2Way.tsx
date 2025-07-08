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

interface ContCTQANOVA2WayProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  onSave?: (data: string) => void;
}

export function ContCTQANOVA2Way({ projectId, ctqId, ctqName, onSave }: ContCTQANOVA2WayProps) {
// Hypothesis Testing state
    const { toast } = useToast();
    // Correlation Analysis state
  
  return (
        <Card>
                <CardHeader>
                <CardTitle>ANOVA Two Way</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Identify relationships between your CTQ and two variables.
                  </p>
                  
                  
                </CardContent>
                </Card>
)}