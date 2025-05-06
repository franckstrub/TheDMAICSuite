/**
 * DMAIC Data Section Template
 * 
 * This template provides a standardized approach for creating data-driven sections
 * within the DMAIC phases that require persistence between sessions. It follows
 * the same pattern used for the customer requirements section in DefinePhase.tsx.
 * 
 * How to use:
 * 1. Define your section-specific interfaces and types
 * 2. Customize state and handlers for your specific needs
 * 3. Adapt the API endpoints and payloads as needed
 * 4. Implement your section's specific UI components
 * 
 * The pattern focuses on consistent data loading, persistence, and display order
 * across all user interactions and page navigations.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// ===========================================================================
// 1. Type Definitions - Customize these for your section
// ===========================================================================

/**
 * Define the shape of your section's data items
 */
interface SectionItem {
  id?: number;               // Database ID of the item (may be undefined for new items)
  field1: string;            // Replace with your actual fields
  field2: string;            
  numericField: number;      
  // Add other fields as needed
}

/**
 * Define the props for your section component
 */
interface SectionProps {
  projectId: string | number;
  userId?: number;
  // Add other props as needed
}

// ===========================================================================
// 2. Component Definition
// ===========================================================================

export default function DataSectionTemplate({ projectId, userId }: SectionProps) {
  // -----------------------------------------------------------------------
  // State and Hooks
  // -----------------------------------------------------------------------
  const [items, setItems] = useState<SectionItem[]>([{ field1: '', field2: '', numericField: 0 }]);
  const toast = useToast();
  const queryClient = useQueryClient();

  // -----------------------------------------------------------------------
  // Data Fetching with React Query
  // -----------------------------------------------------------------------
  const { 
    data: itemsData, 
    isLoading: isItemsLoading, 
    refetch: refetchItems 
  } = useQuery({
    queryKey: [`/api/projects/${projectId}/your-section-items`], // Update API endpoint
    enabled: !!userId && !!projectId,
    retry: 3,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refetch every 10 seconds to ensure latest data
  });

  // -----------------------------------------------------------------------
  // Initial Data Loading - Triggered on Mount or Return to Page
  // -----------------------------------------------------------------------
  useEffect(() => {
    console.log("Component mounted - checking for saved items");
    
    // Check if we have previously saved items in sessionStorage
    const hasItems = sessionStorage.getItem(`project_${projectId}_has_section_items`);
    
    if (hasItems === 'true') {
      console.log("Items flag found in sessionStorage, loading from database");
      // Load data directly from database to ensure we have the latest
      loadItemsFromDatabase(true);
    }
  }, [projectId]);
  
  // -----------------------------------------------------------------------
  // React to Data Changes - Keep UI in Sync with Database
  // -----------------------------------------------------------------------
  useEffect(() => {
    console.log("Items data changed:", itemsData);
    if (itemsData?.items && itemsData.items.length > 0) {
      // Sort the items data by ID to maintain consistent order
      const sortedItems = [...itemsData.items].sort((a, b) => a.id - b.id);
      console.log("Items sorted by ID (ascending order):", sortedItems);
      
      // Map the items data to our state format
      const mappedItems = sortedItems.map((item: any) => ({
        field1: item.field1 || "",
        field2: item.field2 || "",
        numericField: item.numericField || 0,
        id: item.id, // Include ID to help with sorting
      }));
      
      console.log("Mapped items from data change:", mappedItems);
      
      // Set the items state with the mapped data
      setItems(mappedItems);
      
      // Also set the sessionStorage flag to remember we have items for this project
      sessionStorage.setItem(`project_${projectId}_has_section_items`, 'true');
    } else if (itemsData) {
      // If we got data but no items, ensure we have at least one empty row
      console.log("No items found in data change, setting default empty row");
      setItems([
        { field1: "", field2: "", numericField: 0 }
      ]);
    }
  }, [itemsData, projectId]);

  // -----------------------------------------------------------------------
  // Database Operations - Main Loading Function
  // -----------------------------------------------------------------------
  const loadItemsFromDatabase = async (silent = false) => {
    try {
      console.log("Explicitly loading items from database");
      const response = await fetch(`/api/projects/${projectId}/your-section-items`); // Update API endpoint
      const data = await response.json();
      console.log("Loaded items from database:", data);
      
      if (data?.items && data.items.length > 0) {
        // Map the items data and sort by ID to maintain order
        // Sort by ID in ascending order so the first entered item appears first
        const sortedItems = [...data.items].sort((a, b) => a.id - b.id);
        console.log("Items sorted by ID (ascending order):", sortedItems);
        
        const mappedItems = sortedItems.map((item: any) => ({
          field1: item.field1 || "",
          field2: item.field2 || "",
          numericField: item.numericField || 0,
          id: item.id, // Store the ID to help with sorting
        }));
        
        console.log("Setting items state with mapped data:", mappedItems);
        // Set the items state with the mapped data
        setItems(mappedItems);
        
        // Also trigger a query invalidation for React Query
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/your-section-items`] });
        
        if (!silent) {
          toast({
            title: "Data Refreshed",
            description: "Items loaded successfully",
          });
        }
        
        return mappedItems;
      } else {
        // If no items found in the API response, ensure we have at least one empty row
        console.log("No items found in database, setting default empty row");
        const defaultRow = [{ field1: "", field2: "", numericField: 0 }];
        setItems(defaultRow);
        return defaultRow;
      }
    } catch (error) {
      console.error("Error loading items from database:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Could not load section items",
          variant: "destructive",
        });
      }
      
      // Ensure we have at least one empty row even on error
      const defaultRow = [{ field1: "", field2: "", numericField: 0 }];
      setItems(defaultRow);
      return defaultRow;
    }
  };

  // -----------------------------------------------------------------------
  // Mutation for Saving Data
  // -----------------------------------------------------------------------
  const saveItemsMutation = useMutation({
    mutationFn: async (items: SectionItem[]) => {
      // Filter items where some fields have content
      // Adjust this filtering based on your data requirements
      const validItems = items.filter(item => 
        item.field1.trim() !== "" || item.field2.trim() !== ""
      );
      
      // Always include at least one row even if empty, to ensure we always have a row in the database
      const itemsToSave = validItems.length > 0 ? 
        validItems : 
        [{ field1: "", field2: "", numericField: 0 }];
      
      console.log("Saving items:", itemsToSave);
      
      try {
        // First, get existing items to delete them
        const existingItemsResponse = await fetch(`/api/projects/${projectId}/your-section-items`);
        const existingItemsData = await existingItemsResponse.json();
        console.log("Current items in database before deletion:", existingItemsData);
        
        // Delete all existing items
        if (existingItemsData && existingItemsData.items && existingItemsData.items.length > 0) {
          console.log(`Deleting ${existingItemsData.items.length} existing items`);
          const deletePromises = existingItemsData.items.map((item: any) => 
            apiRequest("DELETE", `/api/your-section-items/${item.id}`, { userId, projectId })
          );
          await Promise.all(deletePromises);
          console.log("All existing items deleted");
        }
        
        // Now create new items
        console.log(`Creating ${itemsToSave.length} new items`);
        const createPromises = itemsToSave.map(item => {
          const payload = {
            projectId,
            field1: item.field1,
            field2: item.field2,
            numericField: item.numericField,
            userId,
          };
          
          return apiRequest("POST", `/api/projects/${projectId}/your-section-items`, payload);
        });
        
        const results = await Promise.all(createPromises);
        console.log("New items created:", results);
        return results;
      } catch (error) {
        console.error("Error saving items:", error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log("Items saved successfully:", data);
      toast({
        title: "Success",
        description: "Section items saved successfully",
      });
      
      try {
        // Directly fetch the latest items instead of just invalidating the query
        console.log("Fetching latest items after successful save");
        const response = await fetch(`/api/projects/${projectId}/your-section-items`);
        const freshData = await response.json();
        console.log("Fresh items data after save:", freshData);
        
        if (freshData?.items && freshData.items.length > 0) {
          // Sort the items data by ID to maintain order
          const sortedItems = [...freshData.items].sort((a, b) => a.id - b.id);
          console.log("Items sorted by ID in ascending order:", sortedItems);
          
          // Map the items data
          const mappedItems = sortedItems.map((item: any) => ({
            field1: item.field1 || "",
            field2: item.field2 || "",
            numericField: item.numericField || 0,
            id: item.id, // Store ID for consistency and sorting
          }));
          
          console.log("Setting items state with fresh sorted data:", mappedItems);
          // Force update the state with the fresh data
          setItems(mappedItems);
        }
        
        // Also invalidate the query to ensure consistency
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/your-section-items`] });
      } catch (error) {
        console.error("Error fetching items after save:", error);
      }
    },
    onError: (error) => {
      console.error("Error in items mutation:", error);
      toast({
        title: "Error",
        description: `Failed to save section items: ${error}`,
        variant: "destructive",
      });
    },
  });

  // -----------------------------------------------------------------------
  // Event Handlers
  // -----------------------------------------------------------------------
  const handleSaveItems = async () => {
    console.log("handleSaveItems called with items:", items);
    
    try {
      // Ensure we always have at least one row (even if empty) before saving
      let itemsToSave = items;
      if (items.length === 0) {
        itemsToSave = [{ field1: "", field2: "", numericField: 0 }];
        setItems(itemsToSave);
      }
      
      // Disable refetching temporarily to prevent race conditions
      await queryClient.cancelQueries({ queryKey: [`/api/projects/${projectId}/your-section-items`] });
      
      // First retrieve existing items to ensure proper cleanup
      const existingItemsResponse = await fetch(`/api/projects/${projectId}/your-section-items`);
      const existingItemsData = await existingItemsResponse.json();
      console.log("Current items in database before save:", existingItemsData);
      
      // Now proceed with saving
      console.log("Initiating save operation...");
      await saveItemsMutation.mutateAsync(itemsToSave);
      
      // Force refetch from database to ensure we have the latest data
      console.log("Save complete, now reloading data directly from database");
      await loadItemsFromDatabase(true); // silent load
      
      // Also force a refresh of the query cache
      await refetchItems();
      
      console.log("Items save and reload operation complete");
      
      // Store a flag in sessionStorage to remember that we have items
      // This helps when returning to this component after navigation
      sessionStorage.setItem(`project_${projectId}_has_section_items`, 'true');
    } catch (error) {
      console.error("Error in handleSaveItems:", error);
      toast({
        title: "Error",
        description: "Failed to save section items. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper functions for managing items array
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    const lastItem = items[items.length - 1];
    if (lastItem.field1.trim() !== "" || lastItem.field2.trim() !== "") {
      setItems([...items, { field1: "", field2: "", numericField: 0 }]);
    }
  };

  const removeItem = (index: number) => {
    // Don't remove if it's the first row or if it's the only row remaining
    if (index === 0 || items.length <= 1) {
      return;
    }
    
    const newItems = [...items];
    newItems.splice(index, 1);
    
    // If we're about to remove all rows, make sure we keep at least one empty row
    if (newItems.length === 0) {
      newItems.push({ field1: "", field2: "", numericField: 0 });
    }
    
    setItems(newItems);
  };

  // -----------------------------------------------------------------------
  // Render UI
  // -----------------------------------------------------------------------
  return (
    <div className="data-section-container">
      <h2 className="text-lg font-semibold mb-4">Your Section Title</h2>
      
      {/* Display loading state */}
      {isItemsLoading && <div className="py-4">Loading items...</div>}
      
      {/* Main content - customize this section for your specific UI needs */}
      <div className="items-section bg-white rounded-lg p-4 border border-gray-200">
        {/* Table or form layout for your items */}
        <div className="items-table w-full">
          {/* Table header */}
          <div className="grid grid-cols-3 gap-2 mb-2 font-semibold">
            <div>Field 1</div>
            <div>Field 2</div>
            <div>Numeric Field</div>
          </div>
          
          {/* Table rows */}
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                value={item.field1}
                onChange={(e) => updateItem(index, 'field1', e.target.value)}
                className="border rounded p-2"
                placeholder="Enter field 1"
              />
              <input
                type="text"
                value={item.field2}
                onChange={(e) => updateItem(index, 'field2', e.target.value)}
                className="border rounded p-2"
                placeholder="Enter field 2"
              />
              <div className="flex">
                <input
                  type="number"
                  value={item.numericField}
                  onChange={(e) => updateItem(index, 'numericField', Number(e.target.value))}
                  className="border rounded p-2 flex-grow"
                  placeholder="0"
                />
                {/* Delete button - only shown for rows after the first one */}
                {index > 0 && (
                  <button 
                    onClick={() => removeItem(index)}
                    className="ml-2 text-red-500 hover:text-red-700"
                    aria-label="Remove item"
                  >
                    <span className="sr-only">Remove</span>
                    ✕ {/* You can replace this with an icon from lucide-react */}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Add row button */}
        <button
          onClick={addItem}
          className="mt-4 bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200 transition-colors"
        >
          + Add Row
        </button>
        
        {/* Save button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveItems}
            className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            Save Items
          </button>
        </div>
      </div>
    </div>
  );
}