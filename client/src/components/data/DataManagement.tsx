import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAppContext } from "@/store/AppContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Download, FileUp, Search } from "lucide-react";

export default function DataManagement() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("datasets");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showNewDatasetDialog, setShowNewDatasetDialog] = useState(false);
  
  // Import options state
  const [importOptions, setImportOptions] = useState({
    fileType: "CSV",
    delimiter: "Comma (,)",
    headerRow: "Yes",
    storageLocation: "cloud"
  });
  
  // New dataset form state
  const [newDataset, setNewDataset] = useState({
    name: "",
    description: "",
    projectId: "",
    storageType: "cloud",
    storageLocation: ""
  });

  // Fetch datasets
  const { data: datasetsData, isLoading: isLoadingDatasets } = useQuery({
    queryKey: ["/api/datasets"],
    enabled: !!user?.id,
  });

  // Fetch projects for dropdown
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
    enabled: !!user?.id,
  });

  // Mutation for creating a new dataset
  const createDatasetMutation = useMutation({
    mutationFn: async (datasetData: any) => {
      return apiRequest("POST", "/api/datasets", {
        ...datasetData,
        records: 0,
        variables: 0,
        createdBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dataset created successfully",
      });
      setShowNewDatasetDialog(false);
      // Disable automatic query invalidation to prevent refreshes
      // queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      resetNewDatasetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create dataset",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a dataset
  const deleteDatasetMutation = useMutation({
    mutationFn: async (datasetId: number) => {
      return apiRequest("DELETE", `/api/datasets/${datasetId}`, { userId: user?.id });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dataset deleted successfully",
      });
      // Disable automatic query invalidation to prevent refreshes
      // queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete dataset",
        variant: "destructive",
      });
    },
  });

  const resetNewDatasetForm = () => {
    setNewDataset({
      name: "",
      description: "",
      projectId: "",
      storageType: "cloud",
      storageLocation: ""
    });
  };

  const handleCreateDataset = (e: React.FormEvent) => {
    e.preventDefault();
    createDatasetMutation.mutate(newDataset);
  };

  const handleDeleteDataset = (datasetId: number) => {
    if (confirm("Are you sure you want to delete this dataset? This action cannot be undone.")) {
      deleteDatasetMutation.mutate(datasetId);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Import Started",
      description: "Your data is being imported. You'll be notified when it's complete.",
    });
    setShowImportDialog(false);
  };

  // Filter datasets based on search and project filter
  const filterDatasets = (datasets: any[]) => {
    if (!datasets) return [];
    
    return datasets.filter(dataset => {
      // Filter by project
      if (selectedProject !== 'all' && dataset.projectId !== parseInt(selectedProject)) {
        return false;
      }
      
      // Search by name or description
      if (searchQuery && !dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !dataset.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  };

  // Sample datasets data for demo/fallback
  const sampleDatasets = [
    {
      id: 1,
      name: "Order Processing Data",
      description: "Historical data for order processing times and defects",
      projectId: 1,
      records: 1243,
      variables: 12,
      storageType: "cloud",
      storageLocation: "AWS S3",
      lastUpdated: "2023-05-10T10:30:00Z",
      createdBy: 1
    },
    {
      id: 2,
      name: "Quality Inspection Results",
      description: "Quality inspection outcomes and defect classifications",
      projectId: 2,
      records: 543,
      variables: 8,
      storageType: "local",
      storageLocation: "C:/Data/Quality",
      lastUpdated: "2023-05-08T14:20:00Z",
      createdBy: 1
    },
    {
      id: 3,
      name: "Inventory Management Data",
      description: "Inventory levels, stockouts, and order patterns",
      projectId: 3,
      records: 2187,
      variables: 15,
      storageType: "server",
      storageLocation: "Company Database",
      lastUpdated: "2023-05-05T09:45:00Z",
      createdBy: 1
    }
  ];

  // Use sample data if no datasets are returned from API
  const datasets = filterDatasets(datasetsData?.datasets || sampleDatasets);
  
  // Get project options for select dropdown
  const projectOptions = projectsData?.projects || [
    { id: 1, title: "Order Processing Optimization" },
    { id: 2, title: "Quality Inspection Process" },
    { id: 3, title: "Inventory Management" }
  ];

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Data Management</h1>
          <p className="mt-1 text-sm text-gray-500">Import, manage, and analyze your process data</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center" onClick={() => setActiveTab("export")}>
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
          <Button className="flex items-center" onClick={() => setShowImportDialog(true)}>
            <FileUp className="mr-2 h-4 w-4" /> Import Data
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        
        {/* Datasets Tab */}
        <TabsContent value="datasets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Datasets</CardTitle>
              <Button onClick={() => setShowNewDatasetDialog(true)} size="sm">
                <FileUp className="mr-2 h-4 w-4" /> New Dataset
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search datasets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projectOptions.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {isLoadingDatasets ? (
                <div className="p-8 text-center">
                  <div className="animate-spin h-8 w-8 mx-auto mb-4 border-t-2 border-primary rounded-full"></div>
                  <p className="text-gray-500">Loading datasets...</p>
                </div>
              ) : datasets.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 mb-4">No datasets found.</p>
                  <Button onClick={() => setShowNewDatasetDialog(true)}>
                    Create Your First Dataset
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Variables</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Storage</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {datasets.map((dataset) => (
                        <TableRow key={dataset.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                                <i className="fas fa-table text-blue-500"></i>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{dataset.name}</div>
                                <div className="text-xs text-gray-500">
                                  {dataset.description || "No description"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {dataset.records.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {dataset.variables}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDate(dataset.lastUpdated)}
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                              {dataset.storageType === "cloud" && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Cloud
                                </span>
                              )}
                              {dataset.storageType === "server" && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  Company Server
                                </span>
                              )}
                              {dataset.storageType === "local" && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                  Local
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex space-x-2 justify-end">
                              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-900">
                                View
                              </Button>
                              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-900"
                                onClick={() => handleDeleteDataset(dataset.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Data Import</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Upload your data from various file formats.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <div className="mb-4">
                  <i className="fas fa-file-upload text-4xl text-gray-300"></i>
                </div>
                <p className="text-gray-700 mb-2">Drag and drop your files here, or click to browse</p>
                <p className="text-sm text-gray-500 mb-4">Supported formats: CSV, Excel, JSON, SQL</p>
                <Button>
                  Browse Files
                </Button>
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Import Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="file-type">File Type</Label>
                    <Select
                      value={importOptions.fileType}
                      onValueChange={(value) => setImportOptions({...importOptions, fileType: value})}
                    >
                      <SelectTrigger id="file-type">
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CSV">CSV</SelectItem>
                        <SelectItem value="Excel">Excel</SelectItem>
                        <SelectItem value="JSON">JSON</SelectItem>
                        <SelectItem value="SQL">SQL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="delimiter">Delimiter</Label>
                    <Select
                      value={importOptions.delimiter}
                      onValueChange={(value) => setImportOptions({...importOptions, delimiter: value})}
                    >
                      <SelectTrigger id="delimiter">
                        <SelectValue placeholder="Select delimiter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Comma (,)">Comma (,)</SelectItem>
                        <SelectItem value="Semicolon (;)">Semicolon (;)</SelectItem>
                        <SelectItem value="Tab">Tab</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="header-row">Header Row</Label>
                    <Select
                      value={importOptions.headerRow}
                      onValueChange={(value) => setImportOptions({...importOptions, headerRow: value})}
                    >
                      <SelectTrigger id="header-row">
                        <SelectValue placeholder="Has header row?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2">Storage Location</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 rounded-md p-3 flex items-center space-x-3">
                      <input 
                        type="radio" 
                        name="storage" 
                        id="cloud" 
                        checked={importOptions.storageLocation === "cloud"}
                        onChange={() => setImportOptions({...importOptions, storageLocation: "cloud"})}
                      />
                      <Label htmlFor="cloud" className="text-sm cursor-pointer">
                        <div className="font-medium">Cloud Storage</div>
                        <div className="text-gray-500 text-xs">Secure, accessible from anywhere</div>
                      </Label>
                    </div>
                    <div className="border border-gray-200 rounded-md p-3 flex items-center space-x-3">
                      <input 
                        type="radio" 
                        name="storage" 
                        id="company"
                        checked={importOptions.storageLocation === "company"}
                        onChange={() => setImportOptions({...importOptions, storageLocation: "company"})}
                      />
                      <Label htmlFor="company" className="text-sm cursor-pointer">
                        <div className="font-medium">Company Server</div>
                        <div className="text-gray-500 text-xs">Behind your company firewall</div>
                      </Label>
                    </div>
                    <div className="border border-gray-200 rounded-md p-3 flex items-center space-x-3">
                      <input 
                        type="radio" 
                        name="storage" 
                        id="local"
                        checked={importOptions.storageLocation === "local"}
                        onChange={() => setImportOptions({...importOptions, storageLocation: "local"})}
                      />
                      <Label htmlFor="local" className="text-sm cursor-pointer">
                        <div className="font-medium">Local Storage</div>
                        <div className="text-gray-500 text-xs">Stored on your device only</div>
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button onClick={() => toast({ title: "Import Started", description: "Your data is being imported" })}>
                    Import Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Export your data to various file formats.
              </p>
              
              <div className="mb-6">
                <Label htmlFor="export-dataset">Select Dataset</Label>
                <Select defaultValue="">
                  <SelectTrigger id="export-dataset" className="mt-1">
                    <SelectValue placeholder="Choose a dataset to export" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((dataset) => (
                      <SelectItem key={dataset.id} value={dataset.id.toString()}>
                        {dataset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select defaultValue="CSV">
                    <SelectTrigger id="export-format" className="mt-1">
                      <SelectValue placeholder="Select export format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CSV">CSV</SelectItem>
                      <SelectItem value="Excel">Excel</SelectItem>
                      <SelectItem value="JSON">JSON</SelectItem>
                      <SelectItem value="SQL">SQL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date-range">Date Range</Label>
                  <Select defaultValue="all">
                    <SelectTrigger id="date-range" className="mt-1">
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Data</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mb-6">
                <Label htmlFor="export-columns">Select Columns</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="export-columns" className="mt-1">
                    <SelectValue placeholder="Choose columns to export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Columns</SelectItem>
                    <SelectItem value="custom">Custom Selection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-3">
                <Button>
                  <Download className="mr-2 h-4 w-4" /> Export Data
                </Button>
                <Button variant="outline">
                  <i className="fas fa-cog mr-2"></i> Advanced Options
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>
              Upload your data file and configure import settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImportSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Select Project</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <div className="mb-4">
                  <i className="fas fa-file-upload text-4xl text-gray-300"></i>
                </div>
                <p className="text-gray-700 mb-2">Drop your file here, or click to browse</p>
                <Button variant="outline" type="button">
                  Select File
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="importFileType">File Type</Label>
                  <Select defaultValue="CSV">
                    <SelectTrigger id="importFileType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CSV">CSV</SelectItem>
                      <SelectItem value="Excel">Excel</SelectItem>
                      <SelectItem value="JSON">JSON</SelectItem>
                      <SelectItem value="SQL">SQL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="importStorage">Storage Location</Label>
                  <Select defaultValue="cloud">
                    <SelectTrigger id="importStorage">
                      <SelectValue placeholder="Select storage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cloud">Cloud Storage</SelectItem>
                      <SelectItem value="server">Company Server</SelectItem>
                      <SelectItem value="local">Local Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Import Data</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* New Dataset Dialog */}
      <Dialog open={showNewDatasetDialog} onOpenChange={setShowNewDatasetDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Create New Dataset</DialogTitle>
            <DialogDescription>
              Define a new dataset for your Six Sigma project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDataset}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="datasetName">Dataset Name</Label>
                <Input
                  id="datasetName"
                  value={newDataset.name}
                  onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
                  placeholder="Enter dataset name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="datasetDescription">Description</Label>
                <Textarea
                  id="datasetDescription"
                  value={newDataset.description}
                  onChange={(e) => setNewDataset({ ...newDataset, description: e.target.value })}
                  placeholder="Describe what this dataset contains"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="datasetProject">Associated Project</Label>
                <Select
                  value={newDataset.projectId}
                  onValueChange={(value) => setNewDataset({ ...newDataset, projectId: value })}
                >
                  <SelectTrigger id="datasetProject">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {projectOptions.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="storageType">Storage Type</Label>
                <Select
                  value={newDataset.storageType}
                  onValueChange={(value) => setNewDataset({ ...newDataset, storageType: value })}
                >
                  <SelectTrigger id="storageType">
                    <SelectValue placeholder="Select storage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cloud">Cloud Storage</SelectItem>
                    <SelectItem value="server">Company Server</SelectItem>
                    <SelectItem value="local">Local Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="storageLocation">Storage Location</Label>
                <Input
                  id="storageLocation"
                  value={newDataset.storageLocation}
                  onChange={(e) => setNewDataset({ ...newDataset, storageLocation: e.target.value })}
                  placeholder={newDataset.storageType === "cloud" ? "e.g., AWS S3 Bucket" : 
                              newDataset.storageType === "server" ? "e.g., Database Name" : 
                              "e.g., C:/Data/Project"}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewDatasetDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createDatasetMutation.isPending}>
                {createDatasetMutation.isPending ? "Creating..." : "Create Dataset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
