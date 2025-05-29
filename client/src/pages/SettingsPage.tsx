import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Bell, Shield, Database, Palette, Globe } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      projectUpdates: true,
      phaseReminders: false,
      weeklyReports: true,
    },
    preferences: {
      theme: "light",
      language: "en",
      timezone: "UTC",
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
    },
    privacy: {
      profileVisibility: "team",
      dataSharing: false,
      analyticsOptIn: true,
    }
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Please sign in to access settings.</p>
      </div>
    );
  }

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handlePreferenceChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  const handlePrivacyChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }));
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-gray-600 mt-2">Manage your account preferences and application settings.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                General Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={settings.preferences.theme} onValueChange={(value) => handlePreferenceChange('theme', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={settings.preferences.language} onValueChange={(value) => handlePreferenceChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.preferences.timezone} onValueChange={(value) => handlePreferenceChange('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">Eastern Time</SelectItem>
                      <SelectItem value="PST">Pacific Time</SelectItem>
                      <SelectItem value="CET">Central European Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={settings.preferences.currency} onValueChange={(value) => handlePreferenceChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select value={settings.preferences.dateFormat} onValueChange={(value) => handlePreferenceChange('dateFormat', value)}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Project Updates</p>
                    <p className="text-sm text-gray-500">Get notified when projects are updated</p>
                  </div>
                  <Switch
                    checked={settings.notifications.projectUpdates}
                    onCheckedChange={(checked) => handleNotificationChange('projectUpdates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Phase Reminders</p>
                    <p className="text-sm text-gray-500">Reminders for upcoming phase deadlines</p>
                  </div>
                  <Switch
                    checked={settings.notifications.phaseReminders}
                    onCheckedChange={(checked) => handleNotificationChange('phaseReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-gray-500">Weekly summary of your projects</p>
                  </div>
                  <Switch
                    checked={settings.notifications.weeklyReports}
                    onCheckedChange={(checked) => handleNotificationChange('weeklyReports', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <Select value={settings.privacy.profileVisibility} onValueChange={(value) => handlePrivacyChange('profileVisibility', value)}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="team">Team Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Control who can see your profile information
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Data Sharing</p>
                    <p className="text-sm text-gray-500">Share anonymized data for product improvement</p>
                  </div>
                  <Switch
                    checked={settings.privacy.dataSharing}
                    onCheckedChange={(checked) => handlePrivacyChange('dataSharing', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Analytics</p>
                    <p className="text-sm text-gray-500">Help improve the platform with usage analytics</p>
                  </div>
                  <Switch
                    checked={settings.privacy.analyticsOptIn}
                    onCheckedChange={(checked) => handlePrivacyChange('analyticsOptIn', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>User ID</Label>
                  <Input value={user.id} disabled className="bg-gray-50" />
                  <p className="text-sm text-gray-500 mt-1">
                    Your unique user identifier
                  </p>
                </div>

                <div>
                  <Label>Email Address</Label>
                  <Input value={user.email || ''} disabled className="bg-gray-50" />
                  <p className="text-sm text-gray-500 mt-1">
                    Managed through your authentication provider
                  </p>
                </div>

                <div>
                  <Label>Account Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      Verified
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-600 mb-3">
                    Account deletion and data management are handled through your authentication provider.
                  </p>
                  <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                    Contact Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSaveSettings} className="px-6">
          Save All Settings
        </Button>
      </div>
    </div>
  );
}