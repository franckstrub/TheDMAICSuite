import { useState } from "react";
import { useAppContext, CurrencyType } from "@/store/AppContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const { currency, setCurrency } = useAppContext();
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>(currency);

  const currencyOptions: { value: CurrencyType; label: string }[] = [
    { value: "$", label: "US Dollar ($)" },
    { value: "€", label: "Euro (€)" },
    { value: "£", label: "British Pound (£)" },
    { value: "¥", label: "Japanese Yen (¥)" },
    { value: "₩", label: "Korean Won (₩)" },
    { value: "CHF", label: "Swiss Franc (CHF)" },
  ];

  const handleCurrencyChange = (value: CurrencyType) => {
    setSelectedCurrency(value);
  };

  const saveCurrencySettings = () => {
    setCurrency(selectedCurrency);
    toast({
      title: "Settings saved",
      description: `Currency set to ${currencyOptions.find(option => option.value === selectedCurrency)?.label}`,
    });
  };

  return (
    <div className="py-6 max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
      
      <div className="grid gap-6">
        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Currency Settings</CardTitle>
            <CardDescription>
              Set your preferred currency for financial values displayed throughout the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currency">Display Currency</Label>
                <Select
                  value={selectedCurrency}
                  onValueChange={(value) => handleCurrencyChange(value as CurrencyType)}
                >
                  <SelectTrigger id="currency" className="w-[240px]">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  This currency will be used to display all financial values in the dashboard and throughout the application.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={saveCurrencySettings}>Save Changes</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Additional settings sections can be added here */}
        <Card>
          <CardHeader>
            <CardTitle>User Interface Settings</CardTitle>
            <CardDescription>
              Customize the appearance and behavior of the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">More settings options will be available in future updates.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}