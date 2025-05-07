import React, { useState, useEffect } from 'react';
import { SoftBenefit } from '@shared/schema';
import { Textarea } from '@/components/ui/textarea';

interface CharterSoftBenefitsQuadrantProps {
  benefits: SoftBenefit[];
  onChange?: (updatedBenefits: SoftBenefit[]) => void;
}

const CharterSoftBenefitsQuadrant: React.FC<CharterSoftBenefitsQuadrantProps> = ({ benefits, onChange }) => {
  // State to hold each category's benefits
  const [employeeBenefit, setEmployeeBenefit] = useState<string>('');
  const [customerBenefit, setCustomerBenefit] = useState<string>('');
  const [processBenefit, setProcessBenefit] = useState<string>('');
  const [growthBenefit, setGrowthBenefit] = useState<string>('');
  
  // Load benefits when they change
  useEffect(() => {
    // Process incoming benefits data
    if (benefits && Array.isArray(benefits)) {
      console.log("Benefits data received:", benefits);
      
      // Find one benefit for each category
      const employee = benefits.find(b => b.category === 'employee');
      const customer = benefits.find(b => b.category === 'customer');
      const process = benefits.find(b => b.category === 'process');
      const growth = benefits.find(b => b.category === 'growth');
      
      // Update state with the found benefits
      setEmployeeBenefit(employee?.text || '');
      setCustomerBenefit(customer?.text || '');
      setProcessBenefit(process?.text || '');
      setGrowthBenefit(growth?.text || '');
    }
  }, [benefits]);
  
  // When any benefit is updated, trigger the onChange callback
  useEffect(() => {
    if (onChange) {
      // Create a SoftBenefit array with one entry per category
      const updatedBenefits: SoftBenefit[] = [
        { text: employeeBenefit, category: 'employee' },
        { text: customerBenefit, category: 'customer' },
        { text: processBenefit, category: 'process' },
        { text: growthBenefit, category: 'growth' }
      ];
      
      onChange(updatedBenefits);
    }
  }, [employeeBenefit, customerBenefit, processBenefit, growthBenefit, onChange]);
  
  // Render a benefit card/quadrant
  const renderBenefitQuadrant = (
    title: string,
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>,
    color: string,
    icon: string,
    placeholder: string
  ) => (
    <div className={`p-3 rounded-lg border ${color} h-full`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-lg" aria-hidden="true">{icon}</span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="text-xs min-h-[60px] resize-y"
      />
    </div>
  );
  
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {renderBenefitQuadrant(
        "Employee Benefits",
        employeeBenefit,
        setEmployeeBenefit,
        "border-blue-100 bg-blue-50",
        "👥",
        "Add employee engagement, satisfaction, or teamwork benefits..."
      )}
      {renderBenefitQuadrant(
        "Customer Benefits",
        customerBenefit,
        setCustomerBenefit,
        "border-green-100 bg-green-50",
        "🤝",
        "Add customer satisfaction, loyalty, or experience benefits..."
      )}
      {renderBenefitQuadrant(
        "Process Benefits",
        processBenefit,
        setProcessBenefit,
        "border-amber-100 bg-amber-50",
        "⚙️",
        "Add process stability, quality, or reliability benefits..."
      )}
      {renderBenefitQuadrant(
        "Growth & Learning",
        growthBenefit,
        setGrowthBenefit,
        "border-purple-100 bg-purple-50",
        "📈",
        "Add organizational growth, learning, or innovation benefits..."
      )}
    </div>
  );
};

export default CharterSoftBenefitsQuadrant;