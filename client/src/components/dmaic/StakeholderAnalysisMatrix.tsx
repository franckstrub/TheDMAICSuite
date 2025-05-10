import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Wand2, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  StakeholderAnalysisItem, 
  interestLevels, 
  influenceLevels, 
  supportLevels,
  resistanceTypes,
  type InterestLevel,
  type InfluenceLevel,
  type SupportLevel,
  type ResistanceType
} from '@shared/stakeholderAnalysis';

// Component props
interface StakeholderAnalysisMatrixProps {
  projectId: string | number;
  userId?: number;
}

// Default row for creating new stakeholder items
const createDefaultRow = (projectId: number): StakeholderAnalysisItem => ({
  id: 0,
  projectId,
  stakeholderName: '',
  stakeholderRole: '',
  interestLevel: 'Medium' as InterestLevel,
  influenceLevel: 'Medium' as InfluenceLevel,
  supportLevel: 'Neutral' as SupportLevel,
  resistanceType: 'Technical' as ResistanceType,
  engagementStrategy: '',
  lastUpdated: new Date()
});

// Type for API response data
interface AnalysisResponse {
  items: StakeholderAnalysisItem[];
}

// Main component
export default function StakeholderAnalysisMatrix({ projectId, userId }: StakeholderAnalysisMatrixProps) {
  // State for stakeholder analysis items
  const [items, setItems] = useState<StakeholderAnalysisItem[]>([createDefaultRow(Number(projectId))]);
  const queryClient = useQueryClient();
  const textareaRefs = useRef<{[key: string | number]: HTMLTextAreaElement | null}>({});

  // Data fetching with React Query
  const { 
    data: analysisData, 
    isLoading: isAnalysisLoading, 
    refetch: refetchAnalysis 
  } = useQuery<AnalysisResponse>({
    queryKey: [`/api/projects/${projectId}/stakeholder-analysis`],
    enabled: !!userId && !!projectId,
    retry: 3,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: false, // Refetch every 10 seconds
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
      // Use items as they come from the database without sorting
      console.log("Using stakeholder analysis items in their original order:", analysisData.items);

      // Set the items state with the data
      setItems(analysisData.items);

      // Store flag in sessionStorage
      sessionStorage.setItem(`project_${projectId}_has_stakeholder_analysis`, 'true');
    } else if (analysisData) {
      // If we got data but no items, ensure we have at least one empty row
      console.log("No stakeholder analysis items found, setting default empty row");
      setItems([createDefaultRow(Number(projectId))]);
    }
  }, [analysisData, projectId]);

  // Adjust textarea heights after items are rendered or updated
  useEffect(() => {
    if (items.length > 0) {
      // Use setTimeout to ensure the DOM has been updated
      setTimeout(() => {
        items.forEach((_, index) => {
          // Adjust strategy field
          adjustTextareaHeight(index);

          // Adjust name field
          const nameTextarea = textareaRefs.current[`name-${index}`];
          if (nameTextarea) {
            nameTextarea.style.height = 'auto';
            nameTextarea.style.height = `${Math.max(60, nameTextarea.scrollHeight + 4)}px`;
          }

          // Adjust role field
          const roleTextarea = textareaRefs.current[`role-${index}`];
          if (roleTextarea) {
            roleTextarea.style.height = 'auto';
            roleTextarea.style.height = `${Math.max(60, roleTextarea.scrollHeight + 4)}px`;
          }
        });
        console.log("Adjusted all textarea heights after items update");
      }, 100);
    }
  }, [items]);

  // Function to load analysis from database
  const loadAnalysisFromDatabase = async (silent = false) => {
    try {
      console.log("Explicitly loading stakeholder analysis from database");
      const response = await fetch(`/api/projects/${projectId}/stakeholder-analysis`);

      if (!response.ok) {
        // If 404, it means there's no analysis yet
        if (response.status === 404) {
          console.log("No stakeholder analysis found in database yet");
          const defaultRow = [createDefaultRow(Number(projectId))];
          setItems(defaultRow);
          return defaultRow;
        }

        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json() as AnalysisResponse;
      console.log("Loaded stakeholder analysis from database:", data);

      if (data?.items && data.items.length > 0) {
        // Use items as they come from the database without sorting
        console.log("Using stakeholder analysis items in their original order:", data.items);

        // Set the items state with the data
        setItems(data.items);

        // Also trigger a query invalidation for React Query
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/stakeholder-analysis`] });

        if (!silent) {
          toast({
            title: "Data Refreshed",
            description: "Stakeholder analysis loaded successfully",
          });
        }

        return data.items;
      } else {
        // If no items found, ensure we have at least one empty row
        console.log("No items found in database, setting default empty row");
        const defaultRow = [createDefaultRow(Number(projectId))];
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
      const defaultRow = [createDefaultRow(Number(projectId))];
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
        [createDefaultRow(Number(projectId))];

      console.log("Saving stakeholder analysis items:", itemsToSave);

      try {
        // First, get existing items to delete them
        const existingItemsResponse = await fetch(`/api/projects/${projectId}/stakeholder-analysis`);

        if (existingItemsResponse.ok) {
          const existingItemsData = await existingItemsResponse.json() as AnalysisResponse;
          console.log("Current items in database before deletion:", existingItemsData);

          // Delete all existing items
          if (existingItemsData?.items && existingItemsData.items.length > 0) {
            console.log(`Deleting ${existingItemsData.items.length} existing items`);
            const deletePromises = existingItemsData.items.map((item) => 
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
            resistanceType: item.supportLevel === 'Resistant' ? item.resistanceType : undefined,
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
        const freshData = await response.json() as AnalysisResponse;
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
        itemsToSave = [createDefaultRow(Number(projectId))];
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
      setItems([...items, createDefaultRow(Number(projectId))]);
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
  const getMatrixQuadrant = (interest: InterestLevel, influence: InfluenceLevel) => {
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
    } else if (interest === 'Medium' && influence === 'Low') {
      return "Monitor";
    } else if (interest === 'Low' && influence === 'Medium') {
      return "Monitor";
    } else if (interest === 'Low' && influence === 'Low') {
      return "Monitor";
    } else {
      return "Monitor";
    }
  };

  // Function to generate AI-assisted engagement strategy suggestions
  const generateEngagementStrategy = (
    interest: InterestLevel, 
    influence: InfluenceLevel, 
    supportLevel: SupportLevel,
    resistanceType?: ResistanceType | null
  ) => {
    const position = getMatrixQuadrant(interest, influence);
    const supportState = supportLevel === 'Resistant' 
      ? `resistant (${resistanceType || 'unspecified'} resistance)`
      : supportLevel.toLowerCase();

    // Base strategies by position
    const baseStrategies = {
      "Key Player": [
        "Include in project steering committee",
        "Schedule regular one-on-one meetings",
        "Involve in key decision-making processes",
        "Provide detailed project updates weekly"
      ],
      "Keep Satisfied": [
        "Proactively address concerns",
        "Provide regular status updates",
        "Consult on decisions affecting their area",
        "Schedule monthly check-in meetings"
      ],
      "Key Context Setters": [
        "Focus on relationship building",
        "Emphasize project benefits to their objectives",
        "Leverage their influence for project support",
        "Identify and address potential conflicts early"
      ],
      "Meet Their Needs": [
        "Provide detailed information about their area of interest",
        "Create opportunities for their input",
        "Acknowledge and incorporate their feedback",
        "Show how the project addresses their needs"
      ],
      "Keep Informed": [
        "Share regular project updates",
        "Solicit feedback on specific topics",
        "Include in group communications",
        "Invite to relevant meetings"
      ],
      "Show Consideration": [
        "Acknowledge their interest in the project",
        "Provide information relevant to their concerns",
        "Create opportunities for their input",
        "Address their specific questions"
      ],
      "Monitor": [
        "Include in general project communications",
        "Monitor for changes in interest or influence",
        "Provide basic project information",
        "Minimal engagement unless status changes"
      ]
    };

    // Modified strategies based on support level
    let supportModifiers = {
      "supporter": [
        "Leverage their support to influence others",
        "Recognize their positive contributions",
        "Invite to champion specific project elements",
        "Engage as project advocates"
      ],
      "neutral": [
        "Focus on building understanding and buy-in",
        "Highlight project benefits relevant to them",
        "Provide evidence of project value",
        "Address potential concerns proactively"
      ],
      "resistant": {
        "Technical": [
          "Provide detailed technical information",
          "Involve technical experts they respect",
          "Address specific technical concerns",
          "Create opportunities for technical review"
        ],
        "Political": [
          "Connect project goals to organizational priorities",
          "Identify and address competing interests",
          "Build broader coalition of support",
          "Engage senior leaders to help align interests"
        ],
        "Cultural": [
          "Acknowledge organizational culture concerns",
          "Show alignment with core values",
          "Implement changes gradually with their input",
          "Create cultural transition plan"
        ],
        "Personal": [
          "Address individual concerns privately",
          "Show how project supports their goals",
          "Create win-win opportunities",
          "Identify and mitigate personal impact"
        ],
        "unspecified": [
          "Identify root causes of resistance",
          "Listen to concerns and acknowledge them",
          "Provide information that addresses specific concerns",
          "Find areas of common ground"
        ]
      }
    };

    // Select strategies based on position and support level
    let strategies = [...baseStrategies[position]];

    if (supportLevel === 'Resistant' && resistanceType) {
      strategies = strategies.concat(
        supportModifiers.resistant[resistanceType as keyof typeof supportModifiers.resistant] ||
        supportModifiers.resistant.unspecified
      );
    } else if (supportLevel === 'Supporter') {
      strategies = strategies.concat(supportModifiers.supporter);
    } else if (supportLevel === 'Neutral') {
      strategies = strategies.concat(supportModifiers.neutral);
    }

    // Randomize but ensure we don't always get the same suggestions
    const shuffledStrategies = [...strategies].sort(() => 0.5 - Math.random());

    // Build the personalized strategy suggestion
    let suggestion = `${position} | ${supportLevel}:\n`;

    // Add 2-3 specific strategy elements
    const numStrategies = Math.min(3, shuffledStrategies.length);
    for (let i = 0; i < numStrategies; i++) {
      suggestion += `• ${shuffledStrategies[i]}\n`;
    }

    return suggestion;
  };

  // Function to auto-adjust textarea height based on content
  const adjustTextareaHeight = (index: number | string) => {
    setTimeout(() => {
      const textarea = textareaRefs.current[index];
      if (textarea) {
        // Reset height to default to get accurate scrollHeight measurement
        textarea.style.height = 'auto';

        // Calculate new height based on content (add a small buffer for better appearance)
        const newHeight = Math.max(60, textarea.scrollHeight + 4);
        textarea.style.height = `${newHeight}px`;

        console.log(`Adjusted textarea height for index ${index} to ${newHeight}px`);
      }
    }, 0);
  };

  // Event handler for the refresh button
  const handleRefresh = () => {
    loadAnalysisFromDatabase(false);
  };

  // Render UI
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Stakeholder Analysis Matrix</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {/* Description text */}
        <p className="text-sm text-gray-500 mb-4">
          The Stakeholder Analysis Matrix helps identify stakeholders' influence and interest levels, and plan appropriate engagement strategies.
        </p>

        {/* Display loading state */}
        {isAnalysisLoading && <div className="py-4">Loading stakeholder analysis...</div>}

        {/* Main content */}
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="py-0">
                  <TableHead className="w-1/5 py-1">Stakeholder Name</TableHead>
                  <TableHead className="w-1/5 py-1">Role/Function</TableHead>
                  <TableHead className="w-[5%] py-1">Interest</TableHead>
                  <TableHead className="w-[5%] py-1">Influence</TableHead>
                  <TableHead className="w-[5%] py-1">Support</TableHead>
                  <TableHead className="w-[6%] py-1">Resistance</TableHead>
                  <TableHead className="w-[9%] py-1">Position</TableHead>
                  <TableHead className="w-1/5 py-1">Engagement Strategy</TableHead>
                  <TableHead className="w-[5%] py-1">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="p-1">
                      <Textarea
                        ref={(el) => textareaRefs.current[`name-${index}`] = el}
                        value={item.stakeholderName}
                        onChange={(e) => {
                          updateItem(index, 'stakeholderName', e.target.value);
                          // Auto-adjust height when user types
                          adjustTextareaHeight(`name-${index}`);
                        }}
                        className="min-h-[60px] text-sm w-full resize-y p-1"
                        placeholder="Stakeholder name"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Textarea
                        ref={(el) => textareaRefs.current[`role-${index}`] = el}
                        value={item.stakeholderRole || ''}
                        onChange={(e) => {
                          updateItem(index, 'stakeholderRole', e.target.value);
                          // Auto-adjust height when user types
                          adjustTextareaHeight(`role-${index}`);
                        }}
                        className="min-h-[60px] text-sm w-full resize-y p-1"
                        placeholder="Role/Function"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={item.interestLevel}
                        onValueChange={(value) => updateItem(index, 'interestLevel', value)}
                      >
                        <SelectTrigger className="w-20 text-xs">
                          <SelectValue placeholder="Interest" />
                        </SelectTrigger>
                        <SelectContent>
                          {interestLevels.map((level) => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={item.influenceLevel}
                        onValueChange={(value) => updateItem(index, 'influenceLevel', value)}
                      >
                        <SelectTrigger className="w-20 text-xs">
                          <SelectValue placeholder="Influence" />
                        </SelectTrigger>
                        <SelectContent>
                          {influenceLevels.map((level) => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={item.supportLevel}
                        onValueChange={(value) => updateItem(index, 'supportLevel', value)}
                      >
                        <SelectTrigger className="w-20 text-xs">
                          <SelectValue placeholder="Support" />
                        </SelectTrigger>
                        <SelectContent>
                          {supportLevels.map((level) => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      {item.supportLevel === 'Resistant' ? (
                        <Select
                          value={item.resistanceType || 'Technical'}
                          onValueChange={(value) => updateItem(index, 'resistanceType', value)}
                        >
                          <SelectTrigger className="w-20 text-xs">
                            <SelectValue placeholder="Type" />
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
                    <TableCell className="p-1">
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
                    <TableCell className="p-1">
                      <div className="relative">
                        <Textarea
                          ref={(el) => textareaRefs.current[index] = el}
                          value={item.engagementStrategy || ''}
                          onChange={(e) => {
                            updateItem(index, 'engagementStrategy', e.target.value);
                            // Auto-adjust height when user types
                            adjustTextareaHeight(index);
                          }}
                          className="min-h-[60px] text-xs w-full resize-y p-1 pr-8 whitespace-pre-wrap"
                          placeholder="Strategy to engage and manage this stakeholder"
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="absolute top-1 right-1 h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                                onClick={() => {
                                  const suggestion = generateEngagementStrategy(
                                    item.interestLevel,
                                    item.influenceLevel,
                                    item.supportLevel,
                                    item.supportLevel === 'Resistant' ? item.resistanceType : null
                                  );
                                  updateItem(index, 'engagementStrategy', suggestion);

                                  toast({
                                    title: "AI Strategy Generated",
                                    description: "The engagement strategy has been suggested based on stakeholder attributes",
                                  });

                                  // Auto-adjust height after content is set
                                  setTimeout(() => adjustTextareaHeight(index), 50);
                                }}
                              >
                                <Sparkles className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">Generate AI-suggested engagement strategy</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell className="p-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        className="h-7 w-7 text-red-500 hover:text-red-700 p-1"
                      >
                      <i className="fas fa-trash"></i>
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
          <div className="mt-6 flex justify-start">
            <Button
              onClick={handleSaveAnalysis}
              className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90 transition-colors"
            >
              Save Stakeholder Analysis
            </Button>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex flex-row gap-4">
            <div className="w-1/2">
              <p className="font-medium">Matrix Position Guide:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li><span className="font-medium text-red-700">Key Player:</span> High interest, high influence - Manage closely</li>
                <li><span className="font-medium text-amber-700">Keep Satisfied:</span> Medium interest, high influence - Keep satisfied</li>
                <li><span className="font-medium text-amber-700">Key Context Setters:</span> Low interest, high influence - Keep minimally engaged but well-informed</li>
                <li><span className="font-medium text-blue-700">Meet Their Needs:</span> High interest, medium influence - Keep informed</li>
                <li><span className="font-medium text-blue-700">Keep Informed:</span> Medium interest, medium influence - Keep adequately informed</li>
                <li><span className="font-medium text-blue-700">Show Consideration:</span> High interest, low influence - Show consideration</li>
                <li><span className="font-medium text-gray-700">Monitor:</span> Low interest, low/medium influence - Monitor with minimal effort</li>
              </ul>
            </div>

            <div className="w-1/2">
              <p className="font-medium">Resistance Types:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li><span className="font-medium">Technical:</span> Technical disagreements or concerns</li>
                <li><span className="font-medium">Political:</span> Organizational politics, power struggles, competing priorities</li>
                <li><span className="font-medium">Cultural:</span> Conflicts with established culture or working practices</li>
                <li><span className="font-medium">Personal:</span> Individual concerns, career issues, personal preferences</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}