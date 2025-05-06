# Data Section Implementation Guide

This guide provides step-by-step instructions for implementing a new data section using the established pattern from the customer requirements implementation.

## Implementation Steps

### 1. Server-Side Implementation

#### 1.1. Define schema types

In `shared/schema.ts`:

```typescript
// Define your item table schema
export const yourSectionItems = pgTable('your_section_items', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull(),
  field1: text('field1'),
  field2: text('field2'),
  numericField: integer('numeric_field').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Create insert schema for validation
export const insertYourSectionItemSchema = createInsertSchema(yourSectionItems);

// Create types for TypeScript
export type YourSectionItem = typeof yourSectionItems.$inferSelect;
export type InsertYourSectionItem = z.infer<typeof insertYourSectionItemSchema>;
```

#### 1.2. Add API endpoints

In `server/routes.ts`:

```typescript
// Get items for a project
app.get("/api/projects/:projectId/your-section-items", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const items = await db.select().from(yourSectionItems)
      .where(eq(yourSectionItems.projectId, projectId))
      .orderBy(yourSectionItems.id);
    
    res.json({ items });
  } catch (error) {
    handleErrors(error, res);
  }
});

// Create a new item
app.post("/api/projects/:projectId/your-section-items", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // Validate request body against schema
    const itemData: InsertYourSectionItem = {
      projectId,
      userId: req.body.userId,
      field1: req.body.field1 || "",
      field2: req.body.field2 || "",
      numericField: req.body.numericField || 0,
    };
    
    const [newItem] = await db.insert(yourSectionItems).values(itemData).returning();
    
    res.status(201).json({ item: newItem });
  } catch (error) {
    handleErrors(error, res);
  }
});

// Delete an item
app.delete("/api/your-section-items/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    await db.delete(yourSectionItems).where(eq(yourSectionItems.id, id));
    
    res.json({ success: true });
  } catch (error) {
    handleErrors(error, res);
  }
});
```

### 2. Client-Side Implementation

#### 2.1. Create a new component

Create a new file for your section component based on the `DataSectionTemplate.tsx`:

```typescript
// Import the template structure and adapt it to your specific needs
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// ... additional imports

// Copy and adapt the structure from DataSectionTemplate.tsx
```

#### 2.2. Customize the component for your needs

Modify these key areas:

- **Type definitions**: Update the interface to match your data model
- **API endpoints**: Change the endpoint paths to match your server routes 
- **UI rendering**: Customize the JSX to match your specific UI requirements

#### 2.3. Integrate your component

Add your new component to the appropriate phase component (e.g., DefinePhase.tsx):

```typescript
import YourSectionComponent from './YourSectionComponent';

// In the render section of the phase component:
<YourSectionComponent 
  projectId={projectId} 
  userId={user?.id}
/>
```

## Key Implementation Patterns

### Data Loading Pattern

1. **Initialize with default state**
   ```typescript
   const [items, setItems] = useState<YourSectionItem[]>([{ field1: '', field2: '', numericField: 0 }]);
   ```

2. **React Query setup**
   ```typescript
   const { data, isLoading, refetch } = useQuery({
     queryKey: [`/api/projects/${projectId}/your-section-items`],
     enabled: !!userId && !!projectId,
     staleTime: 5000,
     refetchInterval: 10000,
   });
   ```

3. **Session storage check on mount**
   ```typescript
   useEffect(() => {
     const hasItems = sessionStorage.getItem(`project_${projectId}_has_section_items`);
     if (hasItems === 'true') {
       loadItemsFromDatabase(true);
     }
   }, [projectId]);
   ```

4. **Data processing effect**
   ```typescript
   useEffect(() => {
     if (data?.items && data.items.length > 0) {
       const sortedItems = [...data.items].sort((a, b) => a.id - b.id);
       // Process and set state
     }
   }, [data, projectId]);
   ```

### Save Operation Pattern

1. **Cancel in-flight queries**
   ```typescript
   await queryClient.cancelQueries({ queryKey: [`/api/projects/${projectId}/your-section-items`] });
   ```

2. **Get existing items**
   ```typescript
   const existingItemsResponse = await fetch(`/api/projects/${projectId}/your-section-items`);
   const existingItemsData = await existingItemsResponse.json();
   ```

3. **Delete existing items**
   ```typescript
   const deletePromises = existingItemsData.items.map((item) => 
     apiRequest("DELETE", `/api/your-section-items/${item.id}`, { userId, projectId })
   );
   await Promise.all(deletePromises);
   ```

4. **Create new items**
   ```typescript
   const createPromises = itemsToSave.map(item => {
     const payload = { projectId, field1: item.field1, field2: item.field2, numericField: item.numericField, userId };
     return apiRequest("POST", `/api/projects/${projectId}/your-section-items`, payload);
   });
   await Promise.all(createPromises);
   ```

5. **Force reload and update cache**
   ```typescript
   await loadItemsFromDatabase(true);
   await refetchItems();
   sessionStorage.setItem(`project_${projectId}_has_section_items`, 'true');
   ```

## Testing Your Implementation

1. Add sample data and save it
2. Navigate away from the page and back again
3. Verify data is loaded in the correct order
4. Test edge cases like adding/removing rows
5. Check that data persists across page reloads and session restarts

## Common Issues and Solutions

- **Data appearing in reverse order**: Ensure you're sorting by ID in all three data paths (load function, useEffect data processor, mutation success handler)
- **Missing items after save**: Check that you're reloading directly from the database after save operations
- **Race conditions**: Make sure you're canceling in-flight queries before performing mutation operations
- **Empty rows**: Always ensure you have a default empty row if no data is present