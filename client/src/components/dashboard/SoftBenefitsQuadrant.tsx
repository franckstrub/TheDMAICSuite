import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

interface SoftBenefit {
  id: number;
  text: string;
  projectId: number;
  category: 'employee' | 'customer' | 'process' | 'growth';
}

interface SoftBenefitsQuadrantProps {
  benefits: SoftBenefit[];
}

const SoftBenefitsQuadrant: React.FC<SoftBenefitsQuadrantProps> = ({ benefits }) => {
  // Organize benefits by category
  const employeeBenefits = benefits.filter(b => b.category === 'employee');
  const customerBenefits = benefits.filter(b => b.category === 'customer');
  const processBenefits = benefits.filter(b => b.category === 'process');
  const growthBenefits = benefits.filter(b => b.category === 'growth');

  // Get project IDs that contribute to benefits
  const projectIds = [...new Set(benefits.map(b => b.projectId))];

  // Helper function to render a quadrant
  const renderQuadrant = (title: string, benefitsList: SoftBenefit[], color: string, icon: string) => (
    <div className={`p-4 rounded-lg border ${color} h-full`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">{title}</h3>
        <span className="text-lg" aria-hidden="true">{icon}</span>
      </div>
      {benefitsList.length > 0 ? (
        <ul className="space-y-2">
          {benefitsList.map(benefit => (
            <li key={benefit.id} className="flex text-sm">
              <span className="mr-2 flex-shrink-0">•</span>
              <div>
                <p>{benefit.text}</p>
                <p className="text-xs text-gray-500 mt-0.5">Project ID: {benefit.projectId}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm italic">No benefits recorded</p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Soft Benefits Overview</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help inline-flex">
                  <InfoIcon className="h-4 w-4 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Non-financial benefits derived from projects, organized into four categories:
                  Employee, Customer, Process, and Growth & Learning.
                </p>
                <p className="text-xs mt-1">
                  Based on data from {projectIds.length} project{projectIds.length !== 1 ? 's' : ''}.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderQuadrant("Employee Benefits", employeeBenefits, "border-blue-100 bg-blue-50", "👥")}
          {renderQuadrant("Customer Benefits", customerBenefits, "border-green-100 bg-green-50", "🤝")}
          {renderQuadrant("Process Benefits", processBenefits, "border-amber-100 bg-amber-50", "⚙️")}
          {renderQuadrant("Growth & Learning", growthBenefits, "border-purple-100 bg-purple-50", "📈")}
        </div>
      </CardContent>
    </Card>
  );
};

export default SoftBenefitsQuadrant;