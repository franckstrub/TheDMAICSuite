import React, { useState, useEffect, useRef } from 'react';
import { SoftBenefit } from '@shared/schema';
import { Textarea } from '@/components/ui/textarea';

interface CharterSoftBenefitsQuadrantProps {
  benefits: SoftBenefit[];
  onChange?: (updatedBenefits: SoftBenefit[]) => void;
}

const CharterSoftBenefitsQuadrant: React.FC<CharterSoftBenefitsQuadrantProps> = ({ benefits, onChange }) => {
  // Keep original benefit objects to avoid unnecessary re-renders
  const [benefitsMap, setBenefitsMap] = useState<{
    employee: SoftBenefit,
    customer: SoftBenefit,
    process: SoftBenefit,
    growth: SoftBenefit
  }>({
    employee: { text: '', category: 'employee' },
    customer: { text: '', category: 'customer' },
    process: { text: '', category: 'process' },
    growth: { text: '', category: 'growth' }
  });
  
  // Track if we've initialized from props
  const initialized = useRef(false);
  
  // Load benefits when they change from props, but only if coming from external source
  useEffect(() => {
    // Only process if we have real benefits data from props
    if (benefits && Array.isArray(benefits) && benefits.length > 0) {
      //console.log("Benefits data received:", benefits);
      
      // Create a map of the current benefits by category
      const newBenefitsMap = {...benefitsMap};
      
      // Update the map with data from props
      benefits.forEach(benefit => {
        if (benefit.category in newBenefitsMap) {
          newBenefitsMap[benefit.category as keyof typeof newBenefitsMap] = benefit;
        }
      });
      
      // Only update state if we haven't initialized yet or it's clearly from external data source
      if (!initialized.current) {
        setBenefitsMap(newBenefitsMap);
        initialized.current = true;
      }
    }
  }, [benefits]);
  
  // Update text for a specific category
  const updateBenefitText = (category: SoftBenefit['category'], text: string) => {
    const updatedMap = {...benefitsMap};
    updatedMap[category].text = text;
    
    setBenefitsMap(updatedMap);
    
    // Notify parent of all current benefits immediately
    if (onChange) {
      const allBenefits = Object.values(updatedMap);
      onChange(allBenefits);
    }
  };
  
  // Render a benefit card/quadrant
  const renderBenefitQuadrant = (
    title: string,
    category: SoftBenefit['category'],
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
        value={benefitsMap[category].text}
        onChange={(e) => updateBenefitText(category, e.target.value)}
        placeholder={placeholder}
        className="text-xs min-h-[60px] resize-y"
      />
    </div>
  );
  
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {renderBenefitQuadrant(
        "Employee Benefits",
        "employee",
        "border-blue-100 bg-blue-50",
        "👥",
        "Add employee engagement, satisfaction, or teamwork benefits..."
      )}
      {renderBenefitQuadrant(
        "Customer Benefits",
        "customer",
        "border-green-100 bg-green-50",
        "🤝",
        "Add customer satisfaction, loyalty, or experience benefits..."
      )}
      {renderBenefitQuadrant(
        "Process Benefits",
        "process",
        "border-amber-100 bg-amber-50",
        "⚙️",
        "Add process stability, quality, or reliability benefits..."
      )}
      {renderBenefitQuadrant(
        "Growth & Learning",
        "growth",
        "border-purple-100 bg-purple-50",
        "📈",
        "Add organizational growth, learning, or innovation benefits..."
      )}
    </div>
  );
};

export default CharterSoftBenefitsQuadrant;