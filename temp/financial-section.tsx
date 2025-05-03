import React from 'react';
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function FinancialToggleSection({ 
  charterForm, 
  currency, 
  updateTotalFinancialSavings 
}) {
  const [isFinancialSectionExpanded, setIsFinancialSectionExpanded] = useState(true);
  
  return (
    <div className="mt-6">
      {/* Section header with toggle button */}
      <div 
        className="flex justify-between items-center cursor-pointer p-3 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        onClick={() => setIsFinancialSectionExpanded(!isFinancialSectionExpanded)}
      >
        <h3 className="text-lg font-medium">Project Costs & Financial Metrics</h3>
        <Button variant="ghost" size="sm" className="p-1">
          {isFinancialSectionExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Collapsible content */}
      <AnimatePresence>
        {isFinancialSectionExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border border-gray-200 border-t-0 rounded-b-md p-4 overflow-hidden"
          >
            {/* Project Costs Section */}
            <div>
              <h4 className="text-md font-medium mb-3">Project Costs</h4>
              
              {/* One-off Project Costs */}
              <div className="mb-6">
                <h5 className="text-sm font-medium mb-3 text-gray-700">One-off Project Costs</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="oneOffPeopleCost">People ({currency})</Label>
                    <Input
                      id="oneOffPeopleCost"
                      placeholder="e.g. 5000"
                      type="number"
                      min="0"
                      {...charterForm.register("oneOffPeopleCost")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("oneOffPeopleCost", "0");
                        } else {
                          charterForm.setValue("oneOffPeopleCost", e.target.value);
                        }
                        // Update net value
                        updateTotalFinancialSavings();
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oneOffTechnologyCost">Technology ({currency})</Label>
                    <Input
                      id="oneOffTechnologyCost"
                      placeholder="e.g. 10000"
                      type="number"
                      min="0"
                      {...charterForm.register("oneOffTechnologyCost")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("oneOffTechnologyCost", "0");
                        } else {
                          charterForm.setValue("oneOffTechnologyCost", e.target.value);
                        }
                        // Update net value
                        updateTotalFinancialSavings();
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oneOffOtherCost">Other ({currency})</Label>
                    <Input
                      id="oneOffOtherCost"
                      placeholder="e.g. 2000"
                      type="number"
                      min="0"
                      {...charterForm.register("oneOffOtherCost")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("oneOffOtherCost", "0");
                        } else {
                          charterForm.setValue("oneOffOtherCost", e.target.value);
                        }
                        // Update net value
                        updateTotalFinancialSavings();
                      }}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="oneOffOtherExplanation">Explanation of Other Costs</Label>
                  <Textarea
                    id="oneOffOtherExplanation"
                    placeholder="Explain one-off costs here..."
                    rows={2}
                    {...charterForm.register("oneOffOtherExplanation")}
                  />
                </div>
              </div>
              
              {/* CAPEX Costs */}
              <div className="mb-6">
                <h5 className="text-sm font-medium mb-3 text-gray-700">CAPEX Costs</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capexCost">CAPEX Cost ({currency})</Label>
                    <Input
                      id="capexCost"
                      placeholder="e.g. 25000"
                      type="number"
                      min="0"
                      {...charterForm.register("capexCost")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("capexCost", "0");
                        } else {
                          charterForm.setValue("capexCost", e.target.value);
                        }
                        // Update net value
                        updateTotalFinancialSavings();
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="capexExplanation">Please explain</Label>
                    <Textarea
                      id="capexExplanation"
                      placeholder="Detail capital expenditure costs..."
                      rows={2}
                      {...charterForm.register("capexExplanation")}
                    />
                  </div>
                </div>
              </div>
              
              {/* Total Project Costs */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md mb-6">
                <div className="flex justify-between items-center">
                  <Label htmlFor="totalProjectCosts" className="font-medium text-gray-800">Total Project Costs ({currency})</Label>
                  <Input
                    id="totalProjectCosts"
                    readOnly
                    className="max-w-[200px] bg-white border-gray-200 text-gray-800 font-bold"
                    {...charterForm.register("totalProjectCosts")}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">Sum of all one-off and CAPEX costs</p>
              </div>
            </div>
            
            {/* Financial Metrics Section */}
            <div className="mt-4">
              <h4 className="text-md font-medium mb-3">Financial Metrics</h4>
              
              {/* Financial Metrics Grid - all in one row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Project Net Value Card */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex flex-col">
                    <Label htmlFor="projectNetValue" className="font-medium text-blue-800 mb-2">Project Net Value ({currency})</Label>
                    <Input
                      id="projectNetValue"
                      readOnly
                      className="bg-white border-blue-200 text-blue-800 font-bold text-lg mb-1"
                      {...charterForm.register("projectNetValue")}
                    />
                    <p className="text-xs text-blue-600 mt-1">Total Project Financial Savings (p.a.) - Total Project Costs</p>
                  </div>
                </div>
                
                {/* ROI Card */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex flex-col">
                    <Label htmlFor="roi" className="font-medium text-purple-800 mb-2">Return on Investment (ROI)</Label>
                    <div className="flex items-center space-x-1 mb-1">
                      <Input
                        id="roi"
                        readOnly
                        className="bg-white border-purple-200 text-purple-800 font-bold text-lg"
                        {...charterForm.register("roi")}
                      />
                      <span className="text-purple-800 font-medium text-lg">%</span>
                    </div>
                    <p className="text-xs text-purple-600 mt-1">(Net Value / Total Costs) x 100</p>
                  </div>
                </div>
                
                {/* Breakeven Card */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex flex-col">
                    <Label htmlFor="breakeven" className="font-medium text-amber-800 mb-2">Breakeven Point</Label>
                    <Input
                      id="breakeven"
                      readOnly
                      className="bg-white border-amber-200 text-amber-800 font-bold text-lg mb-1"
                      {...charterForm.register("breakeven")}
                    />
                    <p className="text-xs text-amber-600 mt-1">Time to recover investment</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}