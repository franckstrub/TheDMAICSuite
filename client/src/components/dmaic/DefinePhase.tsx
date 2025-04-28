import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAppContext } from "@/store/AppContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function DefinePhase() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const projectId = currentProject?.id || 1; // Fallback to 1 for demo

  // Project Charter form
  const charterForm = useForm({
    defaultValues: {
      projectTitle: "",
      businessCase: "",
      problemStatement: "",
      goals: "",
      scope: "",
      startDate: "",
      targetEndDate: "",
      savingsPerYear: "",
      cashBenefits: "",
      ftpBenefits: "",
      softBenefits: "",
    },
  });

  // SIPOC form
  const sipocForm = useForm({
    defaultValues: {
      suppliers: "",
      inputs: "",
      process: "",
      outputs: "",
      customers: "",
    },
  });

  // Customer Requirements state
  const [requirements, setRequirements] = useState([
    { requirement: "Fast delivery", importance: 4, satisfaction: 2 },
    { requirement: "Order accuracy", importance: 5, satisfaction: 3 },
    { requirement: "", importance: 3, satisfaction: 3 },
  ]);

  // Fetch project charter if exists
  const { data: charter } = useQuery({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data) => {
      if (data?.charter) {
        charterForm.reset({
          projectTitle: currentProject?.title || "",
          businessCase: data.charter.businessCase || "",
          problemStatement: data.charter.problemStatement || "",
          goals: data.charter.goals || "",
          scope: data.charter.scope || "",
          startDate: currentProject?.startDate 
            ? new Date(currentProject.startDate).toISOString().split('T')[0] 
            : "",
          targetEndDate: currentProject?.targetEndDate 
            ? new Date(currentProject.targetEndDate).toISOString().split('T')[0] 
            : "",
          savingsPerYear: data.charter.savingsPerYear || "",
          cashBenefits: data.charter.cashBenefits || "",
          ftpBenefits: data.charter.ftpBenefits || "",
          softBenefits: data.charter.softBenefits || "",
        });
      }
    },
  });

  // Fetch SIPOC diagram if exists
  const { data: sipoc } = useQuery({
    queryKey: [`/api/projects/${projectId}/sipoc`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data) => {
      if (data?.sipoc) {
        sipocForm.reset({
          suppliers: data.sipoc.suppliers || "",
          inputs: data.sipoc.inputs || "",
          process: data.sipoc.process || "",
          outputs: data.sipoc.outputs || "",
          customers: data.sipoc.customers || "",
        });
      }
    },
  });

  // Fetch customer requirements
  const { data: requirementsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/requirements`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data) => {
      if (data?.requirements && data.requirements.length > 0) {
        setRequirements(data.requirements.map((r: any) => ({
          requirement: r.requirement,
          importance: r.importance,
          satisfaction: r.satisfaction,
        })));
      }
    },
  });

  // Save project charter mutation
  const saveCharterMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        projectId,
        businessCase: data.businessCase,
        problemStatement: data.problemStatement,
        goals: data.goals,
        scope: data.scope,
        savingsPerYear: data.savingsPerYear,
        cashBenefits: data.cashBenefits,
        ftpBenefits: data.ftpBenefits,
        softBenefits: data.softBenefits,
        userId: user?.id,
      };

      // Check if charter exists
      if (charter?.charter?.id) {
        return apiRequest("PUT", `/api/charters/${charter.charter.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/charter`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project charter saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/charter`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save project charter: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Save SIPOC diagram mutation
  const saveSipocMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        projectId,
        ...data,
        userId: user?.id,
      };

      // Check if SIPOC exists
      if (sipoc?.sipoc?.id) {
        return apiRequest("PUT", `/api/sipocs/${sipoc.sipoc.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/sipoc`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SIPOC diagram saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sipoc`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save SIPOC diagram: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Save customer requirements mutation
  const saveRequirementsMutation = useMutation({
    mutationFn: async (requirements: any[]) => {
      const validRequirements = requirements.filter(r => r.requirement.trim() !== "");
      
      // For simplicity, just create/update each requirement
      const promises = validRequirements.map(r => {
        const payload = {
          projectId,
          requirement: r.requirement,
          importance: r.importance,
          satisfaction: r.satisfaction,
          userId: user?.id,
        };
        
        return apiRequest("POST", `/api/projects/${projectId}/requirements`, payload);
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer requirements saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/requirements`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save customer requirements: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveCharter = (data: any) => {
    saveCharterMutation.mutate(data);
  };

  const handleSaveSipoc = (data: any) => {
    saveSipocMutation.mutate(data);
  };

  const handleSaveRequirements = () => {
    saveRequirementsMutation.mutate(requirements);
  };

  const updateRequirement = (index: number, field: string, value: any) => {
    const newRequirements = [...requirements];
    newRequirements[index] = { ...newRequirements[index], [field]: value };
    setRequirements(newRequirements);
  };

  const addRequirement = () => {
    if (requirements[requirements.length - 1].requirement.trim() !== "") {
      setRequirements([...requirements, { requirement: "", importance: 3, satisfaction: 3 }]);
    }
  };

  const removeRequirement = (index: number) => {
    const newRequirements = [...requirements];
    newRequirements.splice(index, 1);
    setRequirements(newRequirements);
  };

  const calculateGap = (importance: number, satisfaction: number) => {
    return importance - satisfaction;
  };

  return (
    <div className="space-y-6">
      {/* Project Charter */}
      <Card>
        <CardHeader>
          <CardTitle>Project Charter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={charterForm.handleSubmit(handleSaveCharter)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectTitle">Project Title</Label>
                  <Input
                    id="projectTitle"
                    placeholder="Order Processing Optimization"
                    {...charterForm.register("projectTitle")}
                  />
                </div>
                <div>
                  <Label htmlFor="businessCase">Business Case</Label>
                  <Textarea
                    id="businessCase"
                    placeholder="Describe the business reason for this project..."
                    rows={3}
                    {...charterForm.register("businessCase")}
                  />
                </div>
                <div>
                  <Label htmlFor="problemStatement">Problem Statement</Label>
                  <Textarea
                    id="problemStatement"
                    placeholder="Define the problem to be solved..."
                    rows={3}
                    {...charterForm.register("problemStatement")}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="goals">Goals & Objectives</Label>
                  <Textarea
                    id="goals"
                    placeholder="List specific, measurable goals..."
                    rows={3}
                    {...charterForm.register("goals")}
                  />
                </div>
                <div>
                  <Label htmlFor="scope">Project Scope</Label>
                  <Textarea
                    id="scope"
                    placeholder="Define what is in and out of scope..."
                    rows={3}
                    {...charterForm.register("scope")}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...charterForm.register("startDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetEndDate">Target End Date</Label>
                    <Input
                      id="targetEndDate"
                      type="date"
                      {...charterForm.register("targetEndDate")}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Project Benefits Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Project Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="savingsPerYear">Savings Per Year ($)</Label>
                    <Input
                      id="savingsPerYear"
                      placeholder="e.g. 100000"
                      {...charterForm.register("savingsPerYear")}
                    />
                    <p className="text-xs text-gray-500 mt-1">Annual cost savings expected from this project</p>
                  </div>
                  <div>
                    <Label htmlFor="cashBenefits">Cash Benefits ($)</Label>
                    <Input
                      id="cashBenefits"
                      placeholder="e.g. 75000"
                      {...charterForm.register("cashBenefits")}
                    />
                    <p className="text-xs text-gray-500 mt-1">One-time or direct cash benefits</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ftpBenefits">FTP Benefits ($)</Label>
                    <Input
                      id="ftpBenefits"
                      placeholder="e.g. 50000"
                      {...charterForm.register("ftpBenefits")}
                    />
                    <p className="text-xs text-gray-500 mt-1">Full-time personnel savings</p>
                  </div>
                  <div>
                    <Label htmlFor="softBenefits">Soft Benefits (Non-Quantifiable)</Label>
                    <Textarea
                      id="softBenefits"
                      placeholder="e.g. Improved employee satisfaction, enhanced customer experience..."
                      rows={3}
                      {...charterForm.register("softBenefits")}
                    />
                    <p className="text-xs text-gray-500 mt-1">Benefits that cannot be directly quantified</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Button type="submit" disabled={saveCharterMutation.isPending} className="mt-6">
              {saveCharterMutation.isPending ? "Saving..." : "Save Project Charter"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SIPOC Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>SIPOC Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Identify the Suppliers, Inputs, Process, Outputs, and Customers involved in the project.
          </p>
          
          <form onSubmit={sipocForm.handleSubmit(handleSaveSipoc)}>
            <div className="grid grid-cols-5 gap-2 mb-4">
              <div className="p-3 bg-blue-50 rounded-md text-center">
                <h4 className="font-medium text-primary text-sm">Suppliers</h4>
              </div>
              <div className="p-3 bg-indigo-50 rounded-md text-center">
                <h4 className="font-medium text-indigo-600 text-sm">Inputs</h4>
              </div>
              <div className="p-3 bg-purple-50 rounded-md text-center">
                <h4 className="font-medium text-purple-600 text-sm">Process</h4>
              </div>
              <div className="p-3 bg-green-50 rounded-md text-center">
                <h4 className="font-medium text-green-600 text-sm">Outputs</h4>
              </div>
              <div className="p-3 bg-yellow-50 rounded-md text-center">
                <h4 className="font-medium text-yellow-600 text-sm">Customers</h4>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              <div className="border border-blue-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="Who provides inputs to the process?"
                  {...sipocForm.register("suppliers")}
                />
              </div>
              <div className="border border-indigo-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="What inputs are required for the process?"
                  {...sipocForm.register("inputs")}
                />
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="What are the steps in the process?"
                  {...sipocForm.register("process")}
                />
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="What are the outputs of the process?"
                  {...sipocForm.register("outputs")}
                />
              </div>
              <div className="border border-yellow-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="Who receives the outputs?"
                  {...sipocForm.register("customers")}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Button type="submit" disabled={saveSipocMutation.isPending}>
                {saveSipocMutation.isPending ? "Saving..." : "Save SIPOC Diagram"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Voice of Customer */}
      <Card>
        <CardHeader>
          <CardTitle>Voice of Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Identify and prioritize customer requirements and needs.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Need</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importance (1-5)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Satisfaction (1-5)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gap</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requirements.map((req, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={req.requirement}
                        onChange={(e) => updateRequirement(index, "requirement", e.target.value)}
                        placeholder={index === requirements.length - 1 ? "Add new requirement..." : ""}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={req.importance}
                        onChange={(e) => updateRequirement(index, "importance", parseInt(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5].map((val) => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={req.satisfaction}
                        onChange={(e) => updateRequirement(index, "satisfaction", parseInt(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5].map((val) => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${calculateGap(req.importance, req.satisfaction) > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                        {calculateGap(req.importance, req.satisfaction)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {index === requirements.length - 1 && req.requirement ? (
                        <Button variant="ghost" size="sm" onClick={addRequirement}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === requirements.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeRequirement(index)} className="text-red-500 hover:text-red-700">
                          <i className="fas fa-trash"></i>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4">
            <Button 
              onClick={handleSaveRequirements}
              disabled={saveRequirementsMutation.isPending || requirements.every(r => !r.requirement)}
            >
              {saveRequirementsMutation.isPending ? "Saving..." : "Save Customer Requirements"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
