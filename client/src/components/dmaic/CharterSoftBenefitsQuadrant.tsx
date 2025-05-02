import React from 'react';
import { SoftBenefit } from '@shared/schema';

interface CharterSoftBenefitsQuadrantProps {
  benefits: SoftBenefit[];
  onRemove?: (index: number) => void;
}

const CharterSoftBenefitsQuadrant: React.FC<CharterSoftBenefitsQuadrantProps> = ({ benefits, onRemove }) => {
  // Organize benefits by category
  const employeeBenefits = benefits.filter(b => b.category === 'employee');
  const customerBenefits = benefits.filter(b => b.category === 'customer');
  const processBenefits = benefits.filter(b => b.category === 'process');
  const growthBenefits = benefits.filter(b => b.category === 'growth');

  // Helper function to get category icon (matching the dashboard)
  const getCategoryIcon = (category: SoftBenefit['category']) => {
    switch (category) {
      case "employee": return "👥"; // Employee icon
      case "customer": return "🤝"; // Customer icon
      case "process": return "⚙️"; // Process icon
      case "growth": return "📈"; // Growth icon
      default: return "✓";
    }
  };

  // Helper function to render a quadrant
  const renderQuadrant = (title: string, benefitsList: SoftBenefit[], color: string, icon: string, category: SoftBenefit['category']) => (
    <div className={`p-3 rounded-lg border ${color} h-full`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-lg" aria-hidden="true">{icon}</span>
      </div>
      {benefitsList.length > 0 ? (
        <ul className="space-y-1">
          {benefitsList.map((benefit, index) => {
            // Find the original index in the complete benefits array
            const originalIndex = benefits.findIndex(b => 
              b.text === benefit.text && b.category === benefit.category);
            
            return (
              <li key={index} className="flex text-xs group">
                <span className="mr-1 flex-shrink-0">•</span>
                <div className="flex-1">
                  <p>{benefit.text}</p>
                </div>
                {onRemove && (
                  <button 
                    type="button"
                    onClick={() => onRemove(originalIndex)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-gray-500 text-xs italic">No {category} benefits</p>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {renderQuadrant("Employee Benefits", employeeBenefits, "border-blue-100 bg-blue-50", "👥", "employee")}
      {renderQuadrant("Customer Benefits", customerBenefits, "border-green-100 bg-green-50", "🤝", "customer")}
      {renderQuadrant("Process Benefits", processBenefits, "border-amber-100 bg-amber-50", "⚙️", "process")}
      {renderQuadrant("Growth & Learning", growthBenefits, "border-purple-100 bg-purple-50", "📈", "growth")}
    </div>
  );
};

export default CharterSoftBenefitsQuadrant;