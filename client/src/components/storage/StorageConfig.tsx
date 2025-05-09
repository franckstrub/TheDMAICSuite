import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAppContext } from "@/store/AppContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StorageConfig() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("locations");

  // Storage configuration state
  const [storageConfig, setStorageConfig] = useState({
    // Cloud settings
    cloudEnabled: true,
    cloudRegion: "US East (N. Virginia)",
    cloudRetention: "6 months",
    cloudEncryption: true,
    
    // Server settings
    serverEnabled: false,
    serverAddress: "",
    serverPort: "3306",
    serverDbType: "MySQL",
    serverAuthType: "basic",
    
    // Local settings
    localEnabled: false,
    localDirectory: "",
    localFormat: "SQLite Database",
    localBackups: true,
    
    // Security settings
    encryptTransit: true,
    encryptRest: true,
    keyRotation: false,
    autoBackup: true,
    backupFrequency: "Weekly",
    retentionPeriod: "1 year",
    
    // Compliance
    gdprCompliance: true,
    hipaaCompliance: false,
    isoCompliance: true
  });

  // Fetch storage configuration if available
  const { data: configData, isLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/storage-config`],
    enabled: !!user?.id,
    onSuccess: (data) => {
      if (data?.config) {
        setStorageConfig({
          ...storageConfig,
          cloudEnabled: data.config.cloudEnabled ?? true,
          cloudRegion: data.config.cloudRegion ?? "US East (N. Virginia)",
          cloudRetention: data.config.cloudRetention ?? "6 months",
          cloudEncryption: data.config.cloudEncryption ?? true,
          serverEnabled: data.config.serverEnabled ?? false,
          serverAddress: data.config.serverAddress ?? "",
          serverPort: data.config.serverPort ?? "3306",
          serverDbType: data.config.serverDbType ?? "MySQL",
          serverAuthType: data.config.serverAuthType ?? "basic",
          localEnabled: data.config.localEnabled ?? false,
          localDirectory: data.config.localDirectory ?? "",
          localFormat: data.config.localFormat ?? "SQLite Database",
          localBackups: data.config.localBackups ?? true,
        });
      }
    },
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      return apiRequest("POST", `/api/users/${user?.id}/storage-config`, config);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Storage configuration saved successfully",
      });
      // Disable automatic query invalidation to prevent refreshes
      // queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/storage-config`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const handleSaveConfig = () => {
    saveConfigMutation.mutate(storageConfig);
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Storage Configuration</h1>
          <p className="mt-1 text-sm text-gray-500">Manage where and how your data is stored</p>
        </div>
        <Button onClick={handleSaveConfig} disabled={saveConfigMutation.isPending}>
          {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="locations">Storage Locations</TabsTrigger>
          <TabsTrigger value="security">Data Privacy & Security</TabsTrigger>
          <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>
        
        {/* Storage Locations Tab */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Storage Locations</CardTitle>
              <CardDescription>Configure where your Lean Six Sigma project data will be stored.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cloud Storage */}
                <Card className={`border ${storageConfig.cloudEnabled ? "border-primary bg-blue-50" : "border-gray-200"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <i className="fas fa-cloud text-blue-500"></i>
                        </div>
                        <h4 className="ml-3 text-lg font-medium">Cloud Storage</h4>
                      </div>
                      <Switch 
                        checked={storageConfig.cloudEnabled}
                        onCheckedChange={(checked) => setStorageConfig({...storageConfig, cloudEnabled: checked})}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Store your data securely in our cloud infrastructure with automatic backups and access from anywhere.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cloud-region">Region</Label>
                        <Select 
                          value={storageConfig.cloudRegion}
                          onValueChange={(value) => setStorageConfig({...storageConfig, cloudRegion: value})}
                          disabled={!storageConfig.cloudEnabled}
                        >
                          <SelectTrigger id="cloud-region" className="bg-white">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US East (N. Virginia)">US East (N. Virginia)</SelectItem>
                            <SelectItem value="US West (Oregon)">US West (Oregon)</SelectItem>
                            <SelectItem value="EU (Ireland)">EU (Ireland)</SelectItem>
                            <SelectItem value="Asia Pacific (Tokyo)">Asia Pacific (Tokyo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="cloud-retention">Data Retention</Label>
                        <Select 
                          value={storageConfig.cloudRetention}
                          onValueChange={(value) => setStorageConfig({...storageConfig, cloudRetention: value})}
                          disabled={!storageConfig.cloudEnabled}
                        >
                          <SelectTrigger id="cloud-retention" className="bg-white">
                            <SelectValue placeholder="Select retention period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1 month">1 month</SelectItem>
                            <SelectItem value="3 months">3 months</SelectItem>
                            <SelectItem value="6 months">6 months</SelectItem>
                            <SelectItem value="1 year">1 year</SelectItem>
                            <SelectItem value="Forever">Forever</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="cloud-encryption" 
                          checked={storageConfig.cloudEncryption}
                          onCheckedChange={(checked) => 
                            setStorageConfig({
                              ...storageConfig, 
                              cloudEncryption: checked === true
                            })
                          }
                          disabled={!storageConfig.cloudEnabled}
                        />
                        <Label 
                          htmlFor="cloud-encryption" 
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Enable data encryption
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Company Server */}
                <Card className={`border ${storageConfig.serverEnabled ? "border-primary bg-green-50" : "border-gray-200"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <i className="fas fa-server text-green-500"></i>
                        </div>
                        <h4 className="ml-3 text-lg font-medium">Company Server</h4>
                      </div>
                      <Switch 
                        checked={storageConfig.serverEnabled}
                        onCheckedChange={(checked) => setStorageConfig({...storageConfig, serverEnabled: checked})}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Connect to your company's own servers to store data behind your firewall and security systems.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="server-address">Server Address</Label>
                        <Input 
                          id="server-address" 
                          value={storageConfig.serverAddress}
                          onChange={(e) => setStorageConfig({...storageConfig, serverAddress: e.target.value})}
                          placeholder="server.company.com"
                          disabled={!storageConfig.serverEnabled}
                          className="bg-white"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="server-port">Port</Label>
                          <Input 
                            id="server-port" 
                            value={storageConfig.serverPort}
                            onChange={(e) => setStorageConfig({...storageConfig, serverPort: e.target.value})}
                            placeholder="3306"
                            disabled={!storageConfig.serverEnabled}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="server-db-type">Database Type</Label>
                          <Select 
                            value={storageConfig.serverDbType}
                            onValueChange={(value) => setStorageConfig({...storageConfig, serverDbType: value})}
                            disabled={!storageConfig.serverEnabled}
                          >
                            <SelectTrigger id="server-db-type" className="bg-white">
                              <SelectValue placeholder="Select database type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MySQL">MySQL</SelectItem>
                              <SelectItem value="PostgreSQL">PostgreSQL</SelectItem>
                              <SelectItem value="SQL Server">SQL Server</SelectItem>
                              <SelectItem value="Oracle">Oracle</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2">Authentication</Label>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="auth-basic" 
                              name="auth" 
                              className="h-4 w-4 text-primary"
                              checked={storageConfig.serverAuthType === "basic"}
                              onChange={() => setStorageConfig({...storageConfig, serverAuthType: "basic"})}
                              disabled={!storageConfig.serverEnabled}
                            />
                            <Label htmlFor="auth-basic" className="ml-2 text-sm text-gray-700">
                              Username/Password
                            </Label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="auth-sso" 
                              name="auth" 
                              className="h-4 w-4 text-primary"
                              checked={storageConfig.serverAuthType === "sso"}
                              onChange={() => setStorageConfig({...storageConfig, serverAuthType: "sso"})}
                              disabled={!storageConfig.serverEnabled}
                            />
                            <Label htmlFor="auth-sso" className="ml-2 text-sm text-gray-700">
                              SSO / LDAP
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Local Storage */}
                <Card className={`border ${storageConfig.localEnabled ? "border-primary bg-purple-50" : "border-gray-200"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <i className="fas fa-laptop text-purple-500"></i>
                        </div>
                        <h4 className="ml-3 text-lg font-medium">Local Storage</h4>
                      </div>
                      <Switch 
                        checked={storageConfig.localEnabled}
                        onCheckedChange={(checked) => setStorageConfig({...storageConfig, localEnabled: checked})}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Store data locally on your device for maximum privacy and offline access.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="local-directory">Storage Directory</Label>
                        <div className="flex">
                          <Input 
                            id="local-directory" 
                            value={storageConfig.localDirectory}
                            onChange={(e) => setStorageConfig({...storageConfig, localDirectory: e.target.value})}
                            placeholder="C:\LeanSigmaFlow\Data"
                            disabled={!storageConfig.localEnabled}
                            className="rounded-r-none bg-white"
                          />
                          <Button 
                            variant="secondary" 
                            className="rounded-l-none"
                            disabled={!storageConfig.localEnabled}
                          >
                            Browse
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="local-format">Storage Format</Label>
                        <Select 
                          value={storageConfig.localFormat}
                          onValueChange={(value) => setStorageConfig({...storageConfig, localFormat: value})}
                          disabled={!storageConfig.localEnabled}
                        >
                          <SelectTrigger id="local-format" className="bg-white">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SQLite Database">SQLite Database</SelectItem>
                            <SelectItem value="JSON Files">JSON Files</SelectItem>
                            <SelectItem value="CSV Files">CSV Files</SelectItem>
                            <SelectItem value="Excel Files">Excel Files</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="local-backups" 
                          checked={storageConfig.localBackups}
                          onCheckedChange={(checked) => 
                            setStorageConfig({
                              ...storageConfig, 
                              localBackups: checked === true
                            })
                          }
                          disabled={!storageConfig.localEnabled}
                        />
                        <Label 
                          htmlFor="local-backups" 
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Automatic backups
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Data Privacy & Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Data Privacy & Security</CardTitle>
              <CardDescription>Configure how your data is protected and managed.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium mb-3">Data Encryption</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="encrypt-transit" 
                        checked={storageConfig.encryptTransit}
                        onCheckedChange={(checked) => 
                          setStorageConfig({
                            ...storageConfig, 
                            encryptTransit: checked === true
                          })
                        }
                      />
                      <div>
                        <Label 
                          htmlFor="encrypt-transit" 
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Encrypt data in transit
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">Data is encrypted while being transferred between systems</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="encrypt-rest" 
                        checked={storageConfig.encryptRest}
                        onCheckedChange={(checked) => 
                          setStorageConfig({
                            ...storageConfig, 
                            encryptRest: checked === true
                          })
                        }
                      />
                      <div>
                        <Label 
                          htmlFor="encrypt-rest" 
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Encrypt data at rest
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">Data is encrypted while stored on disk</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="key-rotation" 
                        checked={storageConfig.keyRotation}
                        onCheckedChange={(checked) => 
                          setStorageConfig({
                            ...storageConfig, 
                            keyRotation: checked === true
                          })
                        }
                      />
                      <div>
                        <Label 
                          htmlFor="key-rotation" 
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Key rotation policy
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">Regularly change encryption keys</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-medium mb-3">Data Access & Retention</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="auto-backup" 
                        checked={storageConfig.autoBackup}
                        onCheckedChange={(checked) => 
                          setStorageConfig({
                            ...storageConfig, 
                            autoBackup: checked === true
                          })
                        }
                      />
                      <div>
                        <Label 
                          htmlFor="auto-backup" 
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Automatic backups
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">Create regular backups of your data</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="backup-frequency">Backup Frequency</Label>
                      <Select 
                        value={storageConfig.backupFrequency}
                        onValueChange={(value) => setStorageConfig({...storageConfig, backupFrequency: value})}
                      >
                        <SelectTrigger id="backup-frequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="retention-period">Data Retention Period</Label>
                      <Select 
                        value={storageConfig.retentionPeriod}
                        onValueChange={(value) => setStorageConfig({...storageConfig, retentionPeriod: value})}
                      >
                        <SelectTrigger id="retention-period">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30 days">30 days</SelectItem>
                          <SelectItem value="90 days">90 days</SelectItem>
                          <SelectItem value="1 year">1 year</SelectItem>
                          <SelectItem value="3 years">3 years</SelectItem>
                          <SelectItem value="Indefinite">Indefinite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 mt-6 pt-6">
                <h4 className="text-md font-medium mb-3">Compliance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-md p-3 flex items-center space-x-3">
                    <Checkbox 
                      id="gdpr" 
                      checked={storageConfig.gdprCompliance}
                      onCheckedChange={(checked) => 
                        setStorageConfig({
                          ...storageConfig, 
                          gdprCompliance: checked === true
                        })
                      }
                    />
                    <div>
                      <Label 
                        htmlFor="gdpr" 
                        className="text-sm cursor-pointer"
                      >
                        <div className="font-medium">GDPR Compliance</div>
                        <div className="text-gray-500 text-xs">European data protection</div>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-3 flex items-center space-x-3">
                    <Checkbox 
                      id="hipaa" 
                      checked={storageConfig.hipaaCompliance}
                      onCheckedChange={(checked) => 
                        setStorageConfig({
                          ...storageConfig, 
                          hipaaCompliance: checked === true
                        })
                      }
                    />
                    <div>
                      <Label 
                        htmlFor="hipaa" 
                        className="text-sm cursor-pointer"
                      >
                        <div className="font-medium">HIPAA Compliance</div>
                        <div className="text-gray-500 text-xs">Healthcare data protection</div>
                      </Label>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-3 flex items-center space-x-3">
                    <Checkbox 
                      id="iso" 
                      checked={storageConfig.isoCompliance}
                      onCheckedChange={(checked) => 
                        setStorageConfig({
                          ...storageConfig, 
                          isoCompliance: checked === true
                        })
                      }
                    />
                    <div>
                      <Label 
                        htmlFor="iso" 
                        className="text-sm cursor-pointer"
                      >
                        <div className="font-medium">ISO 27001</div>
                        <div className="text-gray-500 text-xs">Information security standard</div>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Backup & Recovery Tab */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Recovery</CardTitle>
              <CardDescription>Configure backup settings and manage data recovery options.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium mb-3">Backup Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="backup-schedule">Backup Schedule</Label>
                      <Select defaultValue="Weekly">
                        <SelectTrigger id="backup-schedule">
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="backup-time">Backup Time</Label>
                      <Select defaultValue="1:00 AM">
                        <SelectTrigger id="backup-time">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12:00 AM">12:00 AM</SelectItem>
                          <SelectItem value="1:00 AM">1:00 AM</SelectItem>
                          <SelectItem value="2:00 AM">2:00 AM</SelectItem>
                          <SelectItem value="3:00 AM">3:00 AM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="backup-type">Backup Type</Label>
                      <Select defaultValue="Full">
                        <SelectTrigger id="backup-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full">Full Backup</SelectItem>
                          <SelectItem value="Incremental">Incremental</SelectItem>
                          <SelectItem value="Differential">Differential</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="backup-retention">Backup Retention</Label>
                      <Select defaultValue="30 days">
                        <SelectTrigger id="backup-retention">
                          <SelectValue placeholder="Select retention" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7 days">7 days</SelectItem>
                          <SelectItem value="30 days">30 days</SelectItem>
                          <SelectItem value="60 days">60 days</SelectItem>
                          <SelectItem value="90 days">90 days</SelectItem>
                          <SelectItem value="1 year">1 year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox id="compress-backups" defaultChecked />
                    <Label htmlFor="compress-backups" className="text-sm cursor-pointer">
                      Compress backups to save storage space
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox id="encrypt-backups" defaultChecked />
                    <Label htmlFor="encrypt-backups" className="text-sm cursor-pointer">
                      Encrypt backup files
                    </Label>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium mb-3">Manual Backup</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Create a manual backup of your data at any time.
                  </p>
                  <div className="flex space-x-4">
                    <div className="flex-grow">
                      <Label htmlFor="backup-name">Backup Name</Label>
                      <Input id="backup-name" placeholder="e.g., Pre-update backup" />
                    </div>
                    <div className="flex items-end">
                      <Button>
                        Create Backup Now
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium mb-3">Recent Backups</h4>
                  <div className="relative overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3">Backup Name</th>
                          <th scope="col" className="px-6 py-3">Date Created</th>
                          <th scope="col" className="px-6 py-3">Size</th>
                          <th scope="col" className="px-6 py-3">Type</th>
                          <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white border-b">
                          <td className="px-6 py-4">Weekly-Backup-20230701</td>
                          <td className="px-6 py-4">Jul 1, 2023 1:00 AM</td>
                          <td className="px-6 py-4">256 MB</td>
                          <td className="px-6 py-4">Full</td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">Restore</Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900">Delete</Button>
                            </div>
                          </td>
                        </tr>
                        <tr className="bg-white border-b">
                          <td className="px-6 py-4">Pre-Update-Backup</td>
                          <td className="px-6 py-4">Jun 25, 2023 10:30 AM</td>
                          <td className="px-6 py-4">198 MB</td>
                          <td className="px-6 py-4">Manual</td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">Restore</Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900">Delete</Button>
                            </div>
                          </td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-6 py-4">Weekly-Backup-20230624</td>
                          <td className="px-6 py-4">Jun 24, 2023 1:00 AM</td>
                          <td className="px-6 py-4">245 MB</td>
                          <td className="px-6 py-4">Full</td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">Restore</Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900">Delete</Button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Settings</CardTitle>
              <CardDescription>Configure settings to meet regulatory requirements.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium mb-3">GDPR Compliance</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Settings to comply with the European General Data Protection Regulation.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="data-subject-rights" defaultChecked />
                      <Label htmlFor="data-subject-rights" className="text-sm">
                        Enable data subject rights management
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="consent-tracking" defaultChecked />
                      <Label htmlFor="consent-tracking" className="text-sm">
                        Track user consent for data processing
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="data-portability" defaultChecked />
                      <Label htmlFor="data-portability" className="text-sm">
                        Enable data portability features
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="breach-notification" defaultChecked />
                      <Label htmlFor="breach-notification" className="text-sm">
                        Enable data breach notification system
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium mb-3">HIPAA Compliance</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Settings to comply with the Health Insurance Portability and Accountability Act.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="phi-handling" />
                      <Label htmlFor="phi-handling" className="text-sm">
                        Enable Protected Health Information (PHI) handling
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="access-controls" />
                      <Label htmlFor="access-controls" className="text-sm">
                        Implement stricter access controls
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="audit-trails" />
                      <Label htmlFor="audit-trails" className="text-sm">
                        Enable detailed audit trails for PHI access
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="integrity-controls" />
                      <Label htmlFor="integrity-controls" className="text-sm">
                        Enable data integrity controls
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium mb-3">ISO 27001 Compliance</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Settings to comply with the ISO 27001 information security standard.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="risk-assessment" defaultChecked />
                      <Label htmlFor="risk-assessment" className="text-sm">
                        Enable regular risk assessment features
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="incident-management" defaultChecked />
                      <Label htmlFor="incident-management" className="text-sm">
                        Enable incident management system
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="security-monitoring" defaultChecked />
                      <Label htmlFor="security-monitoring" className="text-sm">
                        Enable enhanced security monitoring
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="continuity-management" defaultChecked />
                      <Label htmlFor="continuity-management" className="text-sm">
                        Enable business continuity management
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium mb-3">Data Processing Agreement</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    View and manage your data processing agreement.
                  </p>
                  
                  <div className="p-4 border border-gray-200 rounded-md bg-gray-50 mb-4">
                    <p className="text-sm">
                      Your current data processing agreement was accepted on <strong>June 15, 2023</strong>. 
                      This agreement covers how we process and protect your data in compliance with relevant regulations.
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button variant="outline">
                      View Agreement
                    </Button>
                    <Button variant="outline">
                      Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
