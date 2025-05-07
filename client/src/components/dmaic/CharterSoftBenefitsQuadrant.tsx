import React, { useEffect, useState } from 'react';
import { SoftBenefit } from '@shared/schema';
import { Textarea } from '@/components/ui/textarea';

interface CharterSoftBenefitsQuadrantProps {
  benefits: SoftBenefit[];
  onRemove?: (index: number) => void;
  onChange?: (updatedBenefits: SoftBenefit[]) => void;
}

const CharterSoftBenefitsQuadrant: React.FC<CharterSoftBenefitsQuadrantProps> = ({ benefits, onRemove, onChange }) => {
  // Store the benefits by category with one default entry for each category
  const [employeeBenefits, setEmployeeBenefits] = useState<SoftBenefit[]>([]);
  const [customerBenefits, setCustomerBenefits] = useState<SoftBenefit[]>([]);
  const [processBenefits, setProcessBenefits] = useState<SoftBenefit[]>([]);
  const [growthBenefits, setGrowthBenefits] = useState<SoftBenefit[]>([]);

  // Initialize our category-specific benefits arrays - now responds to benefits changes
  useEffect(() => {
    console.log("Benefits data changed in CharterSoftBenefitsQuadrant:", benefits);
    const employee = benefits.filter(b => b.category === 'employee');
    const customer = benefits.filter(b => b.category === 'customer');
    const process = benefits.filter(b => b.category === 'process');
    const growth = benefits.filter(b => b.category === 'growth');
    
    setEmployeeBenefits(employee.length > 0 ? employee : [{ text: '', category: 'employee' }]);
    setCustomerBenefits(customer.length > 0 ? customer : [{ text: '', category: 'customer' }]);
    setProcessBenefits(process.length > 0 ? process : [{ text: '', category: 'process' }]);
    setGrowthBenefits(growth.length > 0 ? growth : [{ text: '', category: 'growth' }]);
  }, [benefits]); // Now depends on benefits prop

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

  // Update the main benefits array when any category changes
  const updateBenefits = () => {
    if (!onChange) return;
    
    // Filter out empty benefits and combine all categories
    const allBenefits = [
      ...employeeBenefits.filter(b => b.text.trim() !== ''), 
      ...customerBenefits.filter(b => b.text.trim() !== ''), 
      ...processBenefits.filter(b => b.text.trim() !== ''), 
      ...growthBenefits.filter(b => b.text.trim() !== '')
    ];
    
    onChange(allBenefits);
  };

  // Handler for employee benefits changes
  const handleEmployeeChange = (index: number, text: string) => {
    const updated = [...employeeBenefits];
    updated[index] = { ...updated[index], text };
    setEmployeeBenefits(updated);
    updateBenefits();
  };

  // Handler for customer benefits changes
  const handleCustomerChange = (index: number, text: string) => {
    const updated = [...customerBenefits];
    updated[index] = { ...updated[index], text };
    setCustomerBenefits(updated);
    updateBenefits();
  };

  // Handler for process benefits changes
  const handleProcessChange = (index: number, text: string) => {
    const updated = [...processBenefits];
    updated[index] = { ...updated[index], text };
    setProcessBenefits(updated);
    updateBenefits();
  };

  // Handler for growth benefits changes
  const handleGrowthChange = (index: number, text: string) => {
    const updated = [...growthBenefits];
    updated[index] = { ...updated[index], text };
    setGrowthBenefits(updated);
    updateBenefits();
  };

  // Helper function to render an editable benefit quad
  const renderEditableQuadrant = (
    title: string, 
    benefitsList: SoftBenefit[], 
    color: string, 
    icon: string, 
    category: SoftBenefit['category'],
    handleChange: (index: number, text: string) => void
  ) => (
    <div className={`p-3 rounded-lg border ${color} h-full`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-lg" aria-hidden="true">{icon}</span>
      </div>
      <div className="space-y-2">
        {benefitsList.map((benefit, index) => (
          <Textarea 
            key={index}
            value={benefit.text}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder={`Enter ${title.toLowerCase()}...`}
            className="text-xs min-h-[60px] resize-y"
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {renderEditableQuadrant(
        "Employee Benefits", 
        employeeBenefits, 
        "border-blue-100 bg-blue-50", 
        "👥", 
        "employee",
        handleEmployeeChange
      )}
      {renderEditableQuadrant(
        "Customer Benefits", 
        customerBenefits, 
        "border-green-100 bg-green-50", 
        "🤝", 
        "customer",
        handleCustomerChange
      )}
      {renderEditableQuadrant(
        "Process Benefits", 
        processBenefits, 
        "border-amber-100 bg-amber-50", 
        "⚙️", 
        "process",
        handleProcessChange
      )}
      {renderEditableQuadrant(
        "Growth & Learning", 
        growthBenefits, 
        "border-purple-100 bg-purple-50", 
        "📈", 
        "growth",
        handleGrowthChange
      )}
    </div>
  );
};

export default CharterSoftBenefitsQuadrant;