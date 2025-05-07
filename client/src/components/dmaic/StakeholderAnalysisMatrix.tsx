import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { 
  StakeholderAnalysisItem, 
  interestLevels, 
  influenceLevels, 
  supportLevels,
  resistanceTypes
} from '@shared/stakeholderAnalysis';

// Component props
interface StakeholderAnalysisMatrixProps {
  projectId: string | number;
  userId?: number;
}

// Main component
export default function StakeholderAnalysisMatrix({ projectId, userId }: StakeholderAnalysisMatrixProps) {
  // State for stakeholder analysis items
  const [items, setItems] = useState<StakeholderAnalysisItem[]>([{
    id: 0,
    projectId: Number(projectId),
    stakeholderName: '',
    stakeholderRole: '',
    interestLevel: 'Medium',
    influenceLevel: 'Medium',
    supportLevel: 'Neutral',
    resistanceType: 'Technical',
    engagementStrategy: '',
    lastUpdated: new Date()
  }]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Data fetching with React Query
  const { 
    data: analysisData, 
    isLoading: isAnalysisLoading, 
    refetch: refetchAnalysis 
  } = useQuery({
    queryKey: [`/api/projects/${projectId}/stakeholder-analysis`],
    enabled: !!userId && !!projectId,
    retry: 3,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Initial data loading when component mounts or when returning to page
  useEffect(() => {
    console.log("StakeholderAnalysisMatrix mounted - checking for saved items");
    
    // Check if we have previously saved items in sessionStorage
    const hasItems = sessionStorage.getItem(`project_${projectId}_has_stakeholder_analysis`);
    
    if (hasItems === 'true') {
      console.log("Stakeholder analysis flag found in sessionStorage, loading from database");
      loadAnalysisFromDatabase(true);
    }
  }, [projectId]);
  
  // React to data changes to keep UI in sync with database
  useEffect(() => {
    console.log("Stakeholder analysis data changed:", analysisData);
    if (analysisData?.items && analysisData.items.length > 0) {
      // Sort the items by ID to maintain consistent order
      const sortedItems = [...analysisData.items].sort((a, b) => a.id - b.id);
      console.log("Stakeholder analysis items sorted by ID (ascending order):", sortedItems);
      
      // Set the items state with the data
      setItems(sortedItems);
      
      // Store flag in sessionStorage
      sessionStorage.setItem(`project_${projectId}_has_stakeholder_analysis`, 'true');
    } else if (analysisData) {
      // If we got data but no items, ensure we have at least one empty row
      console.log("No stakeholder analysis items found, setting default empty row");
      setItems([{
        id: 0,
        projectId: Number(projectId),
        stakeholderName: '',
        stakeholderRole: '',
        interestLevel: 'Medium',
        influenceLevel: 'Medium',
        supportLevel: 'Neutral',
        resistanceType: 'Technical',
        engagementStrategy: '',
        lastUpdated: new Date()
      }]);
    }
  }, [analysisData, projectId]);

  // Function to load analysis from database
  const loadAnalysisFromDatabase = async (silent = false) => {
    try {
      console.log("Explicitly loading stakeholder analysis from database");
      const response = await fetch(`/api/projects/${projectId}/stakeholder-analysis`);
      
      if (!response.ok) {
        // If 404, it means there's no analysis yet
        if (response.status === 404) {
          console.log("No stakeholder analysis found in database yet");
          const defaultRow = [{
            id: 0,
            projectId: Number(projectId),
            stakeholderName: '',
            stakeholderRole: '',
            interestLevel: 'Medium',
            influenceLevel: 'Medium',
            supportLevel: 'Neutral',
            resistanceType: 'Technical',
            engagementStrategy: '',
            lastUpdated: new Date()
          }];
          setItems(defaultRow);
          return defaultRow;
        }
        
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Loaded stakeholder analysis from database:", data);
      
      if (data?.items && data.items.length > 0) {
        // Sort by ID to maintain order
        const sortedItems = [...data.items].sort((a, b) => a.id - b.id);
        console.log("Items sorted by ID (ascending order):", sortedItems);
        
        // Set the items state with the data
        setItems(sortedItems);
        
        // Also trigger a query invalidation for React Query
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholder-analysis`] });
        
        if (!silent) {
          toast({
            title: "Data Refreshed",
            description: "Stakeholder analysis loaded successfully",
          });
        }
        
        return sortedItems;
      } else {
        // If no items found, ensure we have at least one empty row
        console.log("No items found in database, setting default empty row");
        const defaultRow = [{
          id: 0,
          projectId: Number(projectId),
          stakeholderName: '',
          stakeholderRole: '',
          interestLevel: 'Medium',
          influenceLevel: 'Medium',
          supportLevel: 'Neutral',
          resistanceType: 'Technical',
          engagementStrategy: '',
          lastUpdated: new Date()
        }];
        setItems(defaultRow);
        return defaultRow;
      }
    } catch (error) {
      console.error("Error loading stakeholder analysis from database:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Could not load stakeholder analysis",
          variant: "destructive",
        });
      }
      
      // Ensure we have at least one empty row even on error
      const defaultRow = [{
        id: 0,
        projectId: Number(projectId),
        stakeholderName: '',
        stakeholderRole: '',
        interestLevel: 'Medium',
        influenceLevel: 'Medium',
        supportLevel: 'Neutral',
        resistanceType: 'Technical',
        engagementStrategy: '',
        lastUpdated: new Date()
      }];
      setItems(defaultRow);
      return defaultRow;
    }
  };

  // Mutation for saving analysis
  const saveAnalysisMutation = useMutation({
    mutationFn: async (items: StakeholderAnalysisItem[]) => {
      // Filter out items with empty stakeholder names
      const validItems = items.filter(item => item.stakeholderName.trim() !== "");
      
      // Always include at least one row even if empty
      const itemsToSave = validItems.length > 0 ? 
        validItems : 
        [{
          id: 0,
          projectId: Number(projectId),
          stakeholderName: '',
          stakeholderRole: '',
          interestLevel: 'Medium',
          influenceLevel: 'Medium',
          supportLevel: 'Neutral',
          resistanceType: 'Technical',
          engagementStrategy: '',
          lastUpdated: new Date()
        }];
      
      console.log("Saving stakeholder analysis items:", itemsToSave);
      
      try {
        // First, get existing items to delete them
        const existingItemsResponse = await fetch(`/api/projects/${projectId}/stakeholder-analysis`);
        
        if (existingItemsResponse.ok) {
          const existingItemsData = await existingItemsResponse.json();
          console.log("Current items in database before deletion:", existingItemsData);
          
          // Delete all existing items
          if (existingItemsData && existingItemsData.items && existingItemsData.items.length > 0) {
            console.log(`Deleting ${existingItemsData.items.length} existing items`);
            const deletePromises = existingItemsData.items.map((item: any) => 
              apiRequest("DELETE", `/api/stakeholder-analysis/${item.id}`, { userId, projectId })
            );
            await Promise.all(deletePromises);
            console.log("All existing items deleted");
          }
        }
        
        // Now create new items
        console.log(`Creating ${itemsToSave.length} new items`);
        const createPromises = itemsToSave.map(item => {
          const payload = {
            projectId,
            stakeholderName: item.stakeholderName,
            stakeholderRole: item.stakeholderRole,
            interestLevel: item.interestLevel,
            influenceLevel: item.influenceLevel,
            supportLevel: item.supportLevel,
            resistanceType: item.supportLevel === 'Resistant' ? item.resistanceType : null,
            engagementStrategy: item.engagementStrategy,
            userId,
          };
          
          return apiRequest("POST", `/api/projects/${projectId}/stakeholder-analysis`, payload);
        });
        
        const results = await Promise.all(createPromises);
        console.log("New stakeholder analysis items created:", results);
        return results;
      } catch (error) {
        console.error("Error saving stakeholder analysis items:", error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log("Stakeholder analysis saved successfully:", data);
      toast({
        title: "Success",
        description: "Stakeholder analysis saved successfully",
      });
      
      try {
        // Directly fetch the latest items instead of just invalidating
        console.log("Fetching latest stakeholder analysis items after successful save");
        const response = await fetch(`/api/projects/${projectId}/stakeholder-analysis`);
        const freshData = await response.json();
        console.log("Fresh stakeholder analysis data after save:", freshData);
        
        if (freshData?.items && freshData.items.length > 0) {
          // Sort by ID
          const sortedItems = [...freshData.items].sort((a, b) => a.id - b.id);
          console.log("Items sorted by ID in ascending order:", sortedItems);
          
          // Update state
          setItems(sortedItems);
        }
        
        // Also invalidate the query to ensure consistency
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholder-analysis`] });
      } catch (error) {
        console.error("Error fetching items after save:", error);
      }
    },
    onError: (error) => {
      console.error("Error in stakeholder analysis mutation:", error);
      toast({
        title: "Error",
        description: `Failed to save stakeholder analysis: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Event handler for saving analysis
  const handleSaveAnalysis = async () => {
    console.log("handleSaveAnalysis called with items:", items);
    
    try {
      // Ensure we always have at least one row before saving
      let itemsToSave = items;
      if (items.length === 0) {
        itemsToSave = [{
          id: 0,
          projectId: Number(projectId),
          stakeholderName: '',
          stakeholderRole: '',
          interestLevel: 'Medium',
          influenceLevel: 'Medium',
          supportLevel: 'Neutral',
          resistanceType: 'Technical',
          engagementStrategy: '',
          lastUpdated: new Date()
        }];
        setItems(itemsToSave);
      }
      
      // Disable refetching temporarily to prevent race conditions
      await queryClient.cancelQueries({ queryKey: [`/api/projects/${projectId}/stakeholder-analysis`] });
      
      // Now proceed with saving
      console.log("Initiating stakeholder analysis save operation...");
      await saveAnalysisMutation.mutateAsync(itemsToSave);
      
      // Force refetch to ensure we have the latest data
      console.log("Save complete, now reloading data directly from database");
      await loadAnalysisFromDatabase(true); // silent load
      
      // Also force a refresh of the query cache
      await refetchAnalysis();
      
      console.log("Stakeholder analysis save and reload operation complete");
      
      // Store a flag in sessionStorage
      sessionStorage.setItem(`project_${projectId}_has_stakeholder_analysis`, 'true');
    } catch (error) {
      console.error("Error in handleSaveAnalysis:", error);
      toast({
        title: "Error",
        description: "Failed to save stakeholder analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper functions for managing items array
  const updateItem = (index: number, field: keyof StakeholderAnalysisItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    const lastItem = items[items.length - 1];
    if (lastItem.stakeholderName.trim() !== "") {
      setItems([...items, {
        id: 0,
        projectId: Number(projectId),
        stakeholderName: '',
        stakeholderRole: '',
        interestLevel: 'Medium',
        influenceLevel: 'Medium',
        supportLevel: 'Neutral',
        resistanceType: 'Technical',
        engagementStrategy: '',
        lastUpdated: new Date()
      }]);
    }
  };

  const removeItem = (index: number) => {
    // Don't remove if it's the last row
    if (items.length <= 1) {
      return;
    }
    
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  // Function to determine matrix quadrant based on interest and influence
  const getMatrixQuadrant = (interest: string, influence: string) => {
    if (interest === 'High' && influence === 'High') {
      return "Key Player";
    } else if (interest === 'High' && influence === 'Medium') {
      return "Meet Their Needs";
    } else if (interest === 'High' && influence === 'Low') {
      return "Show Consideration";
    } else if (interest === 'Medium' && influence === 'High') {
      return "Keep Satisfied";
    } else if (interest === 'Medium' && influence === 'Medium') {
      return "Keep Informed";
    } else if (interest === 'Low' && influence === 'High') {
      return "Key Context Setters";
    } else {
      return "Monitor";
    }
  };

  // Render UI
  return (
    <div className="stakeholder-analysis-container">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Stakeholder Analysis Matrix</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={loadAnalysisFromDatabase}
          disabled={isAnalysisLoading}
        >
          Refresh
        </Button>
      </div>
      
      {/* Display loading state */}
      {isAnalysisLoading && <div className="py-4">Loading stakeholder analysis...</div>}
      
      {/* Main content */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/6">Stakeholder Name</TableHead>
                <TableHead className="w-1/6">Role/Function</TableHead>
                <TableHead className="w-1/12">Interest</TableHead>
                <TableHead className="w-1/12">Influence</TableHead>
                <TableHead className="w-1/12">Support</TableHead>
                <TableHead className="w-1/12">Resistance Type</TableHead>
                <TableHead className="w-1/6">Matrix Position</TableHead>
                <TableHead className="w-1/4">Engagement Strategy</TableHead>
                <TableHead className="w-1/12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={item.stakeholderName}
                      onChange={(e) => updateItem(index, 'stakeholderName', e.target.value)}
                      className="w-full"
                      placeholder="Stakeholder name"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.stakeholderRole}
                      onChange={(e) => updateItem(index, 'stakeholderRole', e.target.value)}
                      className="w-full"
                      placeholder="Role/Function"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.interestLevel}
                      onValueChange={(value) => updateItem(index, 'interestLevel', value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Interest" />
                      </SelectTrigger>
                      <SelectContent>
                        {interestLevels.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.influenceLevel}
                      onValueChange={(value) => updateItem(index, 'influenceLevel', value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Influence" />
                      </SelectTrigger>
                      <SelectContent>
                        {influenceLevels.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.supportLevel}
                      onValueChange={(value) => updateItem(index, 'supportLevel', value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Support" />
                      </SelectTrigger>
                      <SelectContent>
                        {supportLevels.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {item.supportLevel === 'Resistant' ? (
                      <Select
                        value={item.resistanceType || 'Technical'}
                        onValueChange={(value) => updateItem(index, 'resistanceType', value)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Resistance Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {resistanceTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-gray-400 italic text-xs">N/A</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                      item.interestLevel === 'High' && item.influenceLevel === 'High' 
                        ? 'bg-red-100 text-red-800'
                        : item.influenceLevel === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : item.interestLevel === 'High'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getMatrixQuadrant(item.interestLevel, item.influenceLevel)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={item.engagementStrategy}
                      onChange={(e) => updateItem(index, 'engagementStrategy', e.target.value)}
                      className="min-h-[60px] text-xs"
                      placeholder="Strategy to engage and manage this stakeholder"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Add row button */}
        <Button
          onClick={addItem}
          className="mt-4 bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Stakeholder
        </Button>
        
        {/* Save button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveAnalysis}
            className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            Save Analysis
          </Button>
        </div>
      </div>

      {/* Help text */}
      <div className="mt-4 text-sm text-gray-500">
        <p><strong>Matrix Position Guide:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li><span className="font-medium text-red-700">Key Player:</span> High interest, high influence - Manage closely</li>
          <li><span className="font-medium text-amber-700">Keep Satisfied:</span> Low interest, high influence - Keep satisfied</li>
          <li><span className="font-medium text-blue-700">Meet Their Needs:</span> High interest, medium influence - Keep informed</li>
          <li><span className="font-medium text-gray-700">Monitor:</span> Low interest, low influence - Monitor with minimal effort</li>
        </ul>
        
        <p className="mt-3"><strong>Resistance Types:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li><span className="font-medium">Technical:</span> Resistance based on technical disagreements or concerns</li>
          <li><span className="font-medium">Political:</span> Resistance due to organizational politics, power struggles or competing priorities</li>
          <li><span className="font-medium">Cultural:</span> Resistance stemming from organizational culture or established ways of working</li>
          <li><span className="font-medium">Personal:</span> Resistance due to personal reasons, career concerns, or individual preferences</li>
        </ul>
      </div>
    </div>
  );
}