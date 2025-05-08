import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlusCircle, Trash2 } from "lucide-react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/store/AppContext";

// Risk item type definition
type RiskItem = {
  id?: number;
  projectId: number;
  riskName: string;
  probability: string;
  impact: string;
  riskCriticality: number;
  mitigationPlan: string;
  riskOwner: string;
  orderIndex: number;
}

// Default risk item values
const DEFAULT_RISK_ITEM: Omit<RiskItem, 'projectId' | 'orderIndex'> = {
  riskName: "",
  probability: "Low",
  impact: "Low",
  riskCriticality: 1,
  mitigationPlan: "",
  riskOwner: ""
};

export default function RiskAssessmentNew() {
  const { id: projectIdParam } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({});
  const { user, currentProject } = useAppContext();
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = projectIdParam ? parseInt(projectIdParam) : (currentProject?.id || 1);
  
  // Risk criticality calculation matrix (probability x impact)
  const riskCriticalityMatrix = {
    "Low": { "Low": 1, "Medium": 2, "High": 3 },
    "Medium": { "Low": 2, "Medium": 4, "High": 6 },
    "High": { "Low": 3, "Medium": 6, "High": 9 }
  };
  
  // Risk items state
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch risk items
  const fetchRiskItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/risk-items`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch risk items");
      }
      
      const data = await response.json();
      
      // If no items returned, create a default risk item
      if (!data.riskItems || data.riskItems.length === 0) {
        setRiskItems([{
          ...DEFAULT_RISK_ITEM,
          projectId,
          orderIndex: 0
        }]);
      } else {
        // Sort items by orderIndex
        const sortedItems = data.riskItems.sort((a: RiskItem, b: RiskItem) => a.orderIndex - b.orderIndex);
        setRiskItems(sortedItems);
      }
    } catch (error) {
      console.error("Error fetching risk items:", error);
      // Initialize with a default risk item on error
      setRiskItems([{
        ...DEFAULT_RISK_ITEM,
        projectId,
        orderIndex: 0
      }]);
      toast({
        title: "Error",
        description: "Failed to load risk items. A default item has been created.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load risk items on component mount and when projectId changes
  useEffect(() => {
    fetchRiskItems();
  }, [projectId]);
  
  // Add a new risk item
  const addRiskItem = async () => {
    const newItem: RiskItem = {
      ...DEFAULT_RISK_ITEM,
      projectId,
      orderIndex: riskItems.length
    };
    
    try {
      const response = await fetch(`/api/projects/${projectId}/risk-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newItem,
          userId: user?.id || 1
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create risk item");
      }
      
      const data = await response.json();
      
      // Add the new item to the state with the ID from the server
      setRiskItems([...riskItems, data.riskItem]);
      
      toast({
        title: "Success",
        description: "New risk item added",
      });
      
      // Focus on the new item's name field after a short delay
      setTimeout(() => {
        const nameInput = document.getElementById(`risk-name-${riskItems.length}`);
        if (nameInput) {
          nameInput.focus();
        }
      }, 100);
    } catch (error) {
      console.error("Error creating risk item:", error);
      toast({
        title: "Error",
        description: "Failed to add new risk item",
        variant: "destructive",
      });
    }
  };
  
  // Update a risk item
  const updateRiskItem = async (index: number, field: keyof RiskItem, value: any) => {
    // Update the state immediately for a responsive UI
    const updatedItems = [...riskItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If probability or impact changes, update riskCriticality
    if (field === 'probability' || field === 'impact') {
      const probability = field === 'probability' ? value : updatedItems[index].probability;
      const impact = field === 'impact' ? value : updatedItems[index].impact;
      updatedItems[index].riskCriticality = riskCriticalityMatrix[probability][impact];
    }
    
    setRiskItems(updatedItems);
    
    // If the item has an ID, update it on the server
    if (updatedItems[index].id) {
      try {
        const response = await fetch(`/api/risk-items/${updatedItems[index].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updatedItems[index],
            userId: user?.id || 1
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to update risk item");
        }
      } catch (error) {
        console.error("Error updating risk item:", error);
        toast({
          title: "Error",
          description: "Failed to save risk item changes",
          variant: "destructive",
        });
      }
    }
  };
  
  // Delete a risk item
  const deleteRiskItem = async (index: number) => {
    // Check if this is the only risk item
    if (riskItems.length === 1) {
      // If it's the only item, just reset it to default values
      const updatedItems = [...riskItems];
      updatedItems[0] = {
        ...DEFAULT_RISK_ITEM,
        projectId,
        orderIndex: 0,
        id: updatedItems[0].id // Preserve the ID if it exists
      };
      setRiskItems(updatedItems);
      
      // If it has an ID, update it on the server
      if (updatedItems[0].id) {
        try {
          await fetch(`/api/risk-items/${updatedItems[0].id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...updatedItems[0],
              userId: user?.id || 1
            }),
          });
        } catch (error) {
          console.error("Error resetting risk item:", error);
        }
      }
      
      toast({
        title: "Info",
        description: "Risk item reset to default values",
      });
      return;
    }
    
    // Get the item to delete
    const itemToDelete = riskItems[index];
    
    // Remove the item from state
    const updatedItems = riskItems.filter((_, i) => i !== index);
    
    // Update the orderIndex for items after the deleted one
    const reindexedItems = updatedItems.map((item, i) => ({
      ...item,
      orderIndex: i
    }));
    
    setRiskItems(reindexedItems);
    
    // If the item has an ID, delete it on the server
    if (itemToDelete.id) {
      try {
        const response = await fetch(`/api/risk-items/${itemToDelete.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id || 1 }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to delete risk item");
        }
        
        toast({
          title: "Success",
          description: "Risk item deleted",
        });
        
        // Update the orderIndex for all remaining items on the server
        await Promise.all(reindexedItems.map(item => {
          if (item.id) {
            return fetch(`/api/risk-items/${item.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...item,
                userId: user?.id || 1
              }),
            });
          }
          return Promise.resolve();
        }));
      } catch (error) {
        console.error("Error deleting risk item:", error);
        toast({
          title: "Error",
          description: "Failed to delete risk item",
          variant: "destructive",
        });
        // Restore the deleted item in case of error
        fetchRiskItems();
      }
    }
  };
  
  // Adjust textarea height based on content
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(80, textarea.scrollHeight + 5)}px`;
  };
  
  // Set textarea ref and adjust height
  const setTextareaRef = (el: HTMLTextAreaElement | null, index: number) => {
    if (el) {
      textareaRefs.current[`mitigationPlan-${index}`] = el;
      adjustTextareaHeight(el);
    }
  };
  
  // Save all risk items at once (for items without IDs)
  const saveAllItems = async () => {
    try {
      // Create any items that don't have IDs yet
      const itemsToCreate = riskItems.filter(item => !item.id);
      
      if (itemsToCreate.length === 0) {
        toast({
          title: "Info",
          description: "All risk items are already saved",
        });
        return;
      }
      
      // Create new items
      await Promise.all(itemsToCreate.map(item => 
        fetch(`/api/projects/${projectId}/risk-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...item,
            userId: user?.id || 1
          }),
        })
      ));
      
      // Reload items to get IDs
      fetchRiskItems();
      
      toast({
        title: "Success",
        description: "All risk items saved successfully",
      });
    } catch (error) {
      console.error("Error saving all risk items:", error);
      toast({
        title: "Error",
        description: "Failed to save all risk items",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="mb-6 w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold">Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {riskItems.map((riskItem, index) => (
              <div key={`risk-item-${index}`} className="mb-6 p-4 border border-border rounded-md">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-lg font-semibold">Risk #{index + 1}</div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteRiskItem(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {/* Risk Name */}
                  <div className="space-y-2">
                    <label htmlFor={`risk-name-${index}`} className="text-sm font-medium">
                      Risk Name
                    </label>
                    <Input
                      id={`risk-name-${index}`}
                      value={riskItem.riskName}
                      onChange={(e) => updateRiskItem(index, 'riskName', e.target.value)}
                      placeholder="Enter risk name"
                    />
                  </div>
                  
                  {/* Probability and Impact */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Probability
                      </label>
                      <Select 
                        value={riskItem.probability} 
                        onValueChange={(value) => updateRiskItem(index, 'probability', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select probability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Impact
                      </label>
                      <Select 
                        value={riskItem.impact} 
                        onValueChange={(value) => updateRiskItem(index, 'impact', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select impact" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Risk Criticality */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Risk Criticality (Probability × Impact)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-full
                        ${riskItem.riskCriticality <= 2 ? 'bg-green-100 text-green-700' : 
                         riskItem.riskCriticality <= 4 ? 'bg-amber-100 text-amber-700' : 
                         'bg-red-100 text-red-700'}`}>
                        {riskItem.riskCriticality}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {riskItem.riskCriticality}/9
                      </div>
                    </div>
                  </div>
                  
                  {/* Mitigation Plan */}
                  <div className="space-y-2">
                    <label htmlFor={`mitigation-plan-${index}`} className="text-sm font-medium">
                      Mitigation Plan
                    </label>
                    <Textarea
                      id={`mitigation-plan-${index}`}
                      value={riskItem.mitigationPlan}
                      onChange={(e) => updateRiskItem(index, 'mitigationPlan', e.target.value)}
                      placeholder="Enter risk mitigation plan"
                      ref={(el) => setTextareaRef(el, index)}
                      className="min-h-[80px] resize-none"
                      onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                    />
                  </div>
                  
                  {/* Risk Owner */}
                  <div className="space-y-2">
                    <label htmlFor={`risk-owner-${index}`} className="text-sm font-medium">
                      Risk Owner
                    </label>
                    <Input
                      id={`risk-owner-${index}`}
                      value={riskItem.riskOwner}
                      onChange={(e) => updateRiskItem(index, 'riskOwner', e.target.value)}
                      placeholder="Enter risk owner"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center mt-6">
              <Button 
                variant="outline" 
                onClick={addRiskItem}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Add Risk
              </Button>
              
              <Button 
                onClick={saveAllItems}
                className="px-4"
              >
                Save Risk Assessment
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}