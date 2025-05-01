import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  // Helper function to render a quadrant
  const renderQuadrant = (title: string, benefitsList: SoftBenefit[], color: string) => (
    <div className={`p-4 rounded-lg border ${color}`}>
      <h3 className="font-medium mb-2">{title}</h3>
      {benefitsList.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {benefitsList.map(benefit => (
            <li key={benefit.id} className="truncate">• {benefit.text}</li>
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
        <CardTitle className="text-lg font-medium">Soft Benefits Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {renderQuadrant("Employee Benefits", employeeBenefits, "border-blue-100 bg-blue-50")}
          {renderQuadrant("Customer Benefits", customerBenefits, "border-green-100 bg-green-50")}
          {renderQuadrant("Process Benefits", processBenefits, "border-amber-100 bg-amber-50")}
          {renderQuadrant("Growth & Learning", growthBenefits, "border-purple-100 bg-purple-50")}
        </div>
      </CardContent>
    </Card>
  );
};

export default SoftBenefitsQuadrant;