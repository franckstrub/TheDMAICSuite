import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SolutionGenerationProps {
  projectId: number;
  projectType: string;
}

interface Solution {
  id?: number;
  solutionId: string;
  solution: string;
  category: "Technology" | "Process" | "People" | "Organization";
  criticalRootCauses: string;
  benefit?: "Low" | "Medium" | "High";
  effort?: "Low" | "Medium" | "High";
  comments?: string;
}

export default function SolutionGeneration({ projectId, projectType }: SolutionGenerationProps) {
  const { toast } = useToast();
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const isGreenOrBlackBelt = projectType === "Green Belt" || projectType === "Black Belt";

  // Fetch solutions
  const { data: solutionsData } = useQuery<{ solutions: Solution[] }>({
    queryKey: [`/api/projects/${projectId}/solutions`],
    enabled: !!projectId,
  });

  // Create solution mutation
  const createSolutionMutation = useMutation({
    mutationFn: async (solution: Partial<Solution>) => {
      return apiRequest('POST', `/api/projects/${projectId}/solutions`, solution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/solutions`] });
      toast({ title: "Success", description: "Solution created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create solution", variant: "destructive" });
    },
  });

  // Update solution mutation
  const updateSolutionMutation = useMutation({
    mutationFn: async ({ id, ...solution }: Solution) => {
      return apiRequest('PUT', `/api/solutions/${id}`, solution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/solutions`] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update solution", variant: "destructive" });
    },
  });

  // Save all solutions mutation
  const saveAllMutation = useMutation({
    mutationFn: async (solutionsToSave: Solution[]) => {
      const updatePromises = solutionsToSave
        .filter(sol => sol.id) // Only update existing solutions
        .map(({ id, ...solution }) => apiRequest('PUT', `/api/solutions/${id}`, solution));
      
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/solutions`] });
      toast({ title: "Success", description: "All solutions saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save solutions", variant: "destructive" });
    },
  });

  // Delete solution mutation
  const deleteSolutionMutation = useMutation({
    mutationFn: async ({ solutionId, remainingSolutions }: { solutionId: number, remainingSolutions: Solution[] }) => {
      // First delete the solution
      await apiRequest('DELETE', `/api/solutions/${solutionId}`, {});
      
      // Then reindex remaining solutions
      const reindexPromises = remainingSolutions.map((sol, index) => {
        const newSolutionId = `S${index + 1}`;
        if (sol.id && sol.solutionId !== newSolutionId) {
          return apiRequest('PUT', `/api/solutions/${sol.id}`, { ...sol, solutionId: newSolutionId });
        }
        return Promise.resolve();
      });
      
      return Promise.all(reindexPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/solutions`] });
      toast({ title: "Success", description: "Solution deleted and table reindexed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete solution", variant: "destructive" });
    },
  });

  // Load solutions from API
  useEffect(() => {
    if (solutionsData?.solutions) {
      setSolutions(solutionsData.solutions);
    }
  }, [solutionsData]);

  // Add new solution
  const addSolution = () => {
    const newSolutionId = `S${solutions.length + 1}`;
    const newSolution: Partial<Solution> = {
      solutionId: newSolutionId,
      solution: "",
      category: "Process",
      criticalRootCauses: "",
      ...(isGreenOrBlackBelt && { benefit: "Medium", effort: "Medium" }),
      comments: "",
    };
    createSolutionMutation.mutate(newSolution);
  };

  // Update solution field
  const updateSolutionField = (index: number, field: keyof Solution, value: string) => {
    const updatedSolutions = [...solutions];
    updatedSolutions[index] = { ...updatedSolutions[index], [field]: value };
    setSolutions(updatedSolutions);
  };

  // Save all solutions
  const saveAllSolutions = () => {
    saveAllMutation.mutate(solutions);
  };

  // Delete solution
  const deleteSolution = (index: number) => {
    const solution = solutions[index];
    if (solution.id) {
      // Get remaining solutions after deletion
      const remainingSolutions = solutions.filter((_, i) => i !== index);
      deleteSolutionMutation.mutate({ 
        solutionId: solution.id, 
        remainingSolutions 
      });
    }
  };

  // Get position on Benefit-Effort Matrix with adjustment for overlapping solutions
  const getMatrixPosition = (solution: Solution, allSolutions: Solution[]) => {
    const { benefit, effort } = solution;
    if (!benefit || !effort) return { x: 50, y: 50 };
    
    const effortMap = { Low: 83.33, Medium: 50, High: 16.67 }; // Inverted for X axis
    const benefitMap = { Low: 83.33, Medium: 50, High: 16.67 }; // Y axis (Low at bottom, High at top)
    
    const baseX = effortMap[effort as keyof typeof effortMap] || 50;
    const baseY = benefitMap[benefit as keyof typeof benefitMap] || 50;
    
    // Find all solutions with same benefit-effort combination
    const sameCombination = allSolutions.filter(
      sol => sol.benefit === benefit && sol.effort === effort && sol.id
    );
    
    // If only one solution at this position, no adjustment needed
    if (sameCombination.length <= 1) {
      return { x: baseX, y: baseY };
    }
    
    // Find index of current solution in the group
    const indexInGroup = sameCombination.findIndex(sol => sol.id === solution.id);
    
    // Arrange solutions in a circle pattern around the base position
    const radius = 3.0; // Spread radius in percentage points
    const angleStep = (2 * Math.PI) / sameCombination.length;
    const angle = indexInGroup * angleStep;
    
    return {
      x: baseX + radius * Math.cos(angle),
      y: baseY + radius * Math.sin(angle)
    };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Solution Generation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Solution ID</TableHead>
                  <TableHead className="min-w-[200px]">Solution</TableHead>
                  <TableHead className="w-[150px]">Category</TableHead>
                  <TableHead className="min-w-[200px]">Critical Root Causes</TableHead>
                  {isGreenOrBlackBelt && (
                    <>
                      <TableHead className="w-[120px]">Benefit</TableHead>
                      <TableHead className="w-[120px]">Effort</TableHead>
                    </>
                  )}
                  <TableHead className="min-w-[150px]">Comments</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solutions.map((sol, index) => (
                  <TableRow key={sol.id || index}>
                    <TableCell>
                      <Input
                        value={sol.solutionId}
                        readOnly
                        className="bg-gray-50"
                        data-testid={`input-solution-id-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={sol.solution}
                        onChange={(e) => updateSolutionField(index, 'solution', e.target.value)}
                        placeholder="Describe the solution"
                        className="min-h-[60px]"
                        data-testid={`textarea-solution-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={sol.category} 
                        onValueChange={(value) => updateSolutionField(index, 'category', value)}
                      >
                        <SelectTrigger data-testid={`select-category-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Technology">Technology</SelectItem>
                          <SelectItem value="Process">Process</SelectItem>
                          <SelectItem value="People">People</SelectItem>
                          <SelectItem value="Organization">Organization</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={sol.criticalRootCauses}
                        onChange={(e) => updateSolutionField(index, 'criticalRootCauses', e.target.value)}
                        placeholder="Root causes addressed"
                        className="min-h-[60px]"
                        data-testid={`textarea-root-causes-${index}`}
                      />
                    </TableCell>
                    {isGreenOrBlackBelt && (
                      <>
                        <TableCell>
                          <Select 
                            value={sol.benefit} 
                            onValueChange={(value) => updateSolutionField(index, 'benefit', value)}
                          >
                            <SelectTrigger data-testid={`select-benefit-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={sol.effort} 
                            onValueChange={(value) => updateSolutionField(index, 'effort', value)}
                          >
                            <SelectTrigger data-testid={`select-effort-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Textarea
                        value={sol.comments || ""}
                        onChange={(e) => updateSolutionField(index, 'comments', e.target.value)}
                        placeholder="Additional comments"
                        className="min-h-[60px]"
                        data-testid={`textarea-comments-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteSolution(index)}
                        disabled={deleteSolutionMutation.isPending}
                        data-testid={`button-delete-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between mt-4">
            <Button onClick={addSolution} data-testid="button-add-solution">
              <Plus className="h-4 w-4 mr-2" />
              Add Solution
            </Button>
          {/*</div>
          <div className="mt-4">*/}
            <Button 
              onClick={saveAllSolutions} 
              disabled={saveAllMutation.isPending || solutions.length === 0}
              data-testid="button-save-table"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveAllMutation.isPending ? "Saving..." : "Save Solutions"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Benefit-Effort Matrix for Green Belt and Black Belt */}
      {isGreenOrBlackBelt && solutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Benefit-Effort Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="ml-2 mb-2 mr-2 relative w-full h-[500px] border-2 border-gray-300 bg-gradient-to-br from-red-50 via-yellow-50 to-green-50">
              {/* Matrix quadrants */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 m-4 ml-14">
                {/* High Benefit, Low Effort - Quick Wins */}
                <div className="border border-gray-200 bg-yellow-100/20"></div>
                <div className="border border-gray-200 bg-green-100/20"></div>
                <div className="border border-gray-200 bg-green-100/80"></div>
                               
                {/* Medium Benefit */}
                <div className="border border-gray-200 bg-red-100/20"></div>
                <div className="border border-gray-200 bg-yellow-100/30"></div>
                <div className="border border-gray-200 bg-green-100/20"></div>
                
                {/* Low Benefit, High Effort - Avoid */}
                <div className="border border-gray-200 bg-red-100/30"></div>
                <div className="border border-gray-200 bg-red-100/20"></div>
                <div className="border border-gray-200 bg-yellow-100/20"></div>
                
              </div>

              {/* Axis labels */}
              <div className="absolute -left-14 top-1/2 -translate-y-1/2 -rotate-90 font-semibold text-gray-700">
                Benefit →
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-9 font-semibold text-gray-700">
                ← Effort
              </div>

              {/* Y-axis labels */}
              <div className="absolute -left-0 top-[8%] text-sm text-gray-600">High</div>
              <div className="absolute -left-0 top-1/2 -translate-y-1/2 text-sm text-gray-600">Medium</div>
              <div className="absolute -left-0 bottom-[8%] text-sm text-gray-600">Low</div>

              {/* X-axis labels */}
              <div className="absolute top-full mt-0 left-[8%] text-sm text-gray-600">High</div>
              <div className="absolute top-full mt-0 left-1/2 -translate-x-1/2 text-sm text-gray-600">Medium</div>
              <div className="absolute top-full mt-0 right-[8%] text-sm text-gray-600">Low</div>

              {/* Plot solutions */}
              {solutions.map((sol, index) => {
                const pos = getMatrixPosition(sol, solutions);
                return (
                  <div
                    key={sol.id || index}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    data-testid={`matrix-point-${index}`}
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-lg hover:scale-110 transition-transform">
                        {sol.solutionId}
                      </div>
                      <div className="absolute left-full ml-2 top-0 hidden group-hover:block bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                        {sol.solution.substring(0, 50)}{sol.solution.length > 50 ? '...' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Quadrant labels */}
              <div className="absolute top-6 right-6 text-xs font-semibold text-green-700 bg-white/80 px-2 py-1 rounded">
                Quick Wins
              </div>
              <div className="absolute top-6 left-16 text-xs font-semibold text-red-700 bg-white/80 px-2 py-1 rounded">
                Major Projects
              </div>
              <div className="absolute bottom-6 right-6 text-xs font-semibold text-yellow-700 bg-white/80 px-2 py-1 rounded">
                Fill-ins
              </div>
              <div className="absolute bottom-6 left-16 text-xs font-semibold text-yellow-700 bg-white/80 px-2 py-1 rounded">
                Avoid
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
