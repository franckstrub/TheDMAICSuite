import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";

export default function Settings() {
  const { currency, setCurrency } = useAppContext();
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>(currency);
  const [searchQuery, setSearchQuery] = useState("");

  const currencyOptions: { value: CurrencyType; label: string }[] = [
    // Main currencies
    { value: "$", label: "US Dollar ($)" },
    { value: "€", label: "Euro (€)" },
    { value: "£", label: "British Pound (£)" },
    { value: "¥", label: "Japanese Yen (¥)" },
    { value: "CHF", label: "Swiss Franc (CHF)" },
    
    // Asia & Pacific
    { value: "CN¥", label: "Chinese Yuan (CN¥)" },
    { value: "₹", label: "Indian Rupee (₹)" },
    { value: "₩", label: "Korean Won (₩)" },
    { value: "A$", label: "Australian Dollar (A$)" },
    { value: "HK$", label: "Hong Kong Dollar (HK$)" },
    { value: "₱", label: "Philippine Peso (₱)" },
    { value: "฿", label: "Thai Baht (฿)" },
    { value: "RM", label: "Malaysian Ringgit (RM)" },
    { value: "S$", label: "Singapore Dollar (S$)" },
    
    // Americas
    { value: "C$", label: "Canadian Dollar (C$)" },
    { value: "R$", label: "Brazilian Real (R$)" },
    { value: "₲", label: "Paraguayan Guarani (₲)" },
    { value: "CLP", label: "Chilean Peso (CLP)" },
    
    // Europe
    { value: "₽", label: "Russian Ruble (₽)" },
    { value: "₺", label: "Turkish Lira (₺)" },
    // Nordic currencies
    { value: "DKK", label: "Danish Krone (DKK)" },
    { value: "SEK", label: "Swedish Krona (SEK)" },
    { value: "NOK", label: "Norwegian Krone (NOK)" },
    { value: "ISK", label: "Icelandic Króna (ISK)" },
    { value: "zł", label: "Polish Złoty (zł)" },
    { value: "Ft", label: "Hungarian Forint (Ft)" },
    { value: "₴", label: "Ukrainian Hryvnia (₴)" },
    
    // Africa & Middle East
    { value: "R", label: "South African Rand (R)" },
    { value: "₦", label: "Nigerian Naira (₦)" },
    { value: "SAR", label: "Saudi Riyal (SAR)" },
    { value: "AED", label: "UAE Dirham (AED)" },
    
    // Other
    { value: "ƒ", label: "Dutch Guilder/Florin (ƒ)" },
  ];

  // Filter currencies based on search query
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return currencyOptions;
    
    return currencyOptions.filter(option => 
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currencyOptions, searchQuery]);

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
                  <SelectContent className="max-h-80">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Main Currencies</div>
                    {currencyOptions.slice(0, 5).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">Asia & Pacific</div>
                    {currencyOptions.slice(5, 14).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">Americas</div>
                    {currencyOptions.slice(14, 18).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">Europe</div>
                    {currencyOptions.slice(18, 28).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">Africa & Middle East</div>
                    {currencyOptions.slice(28, 32).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">Other</div>
                    {currencyOptions.slice(32).map((option) => (
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
              
              <div className="mt-4">
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Preview</h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
                  <div>
                    <p className="text-sm text-slate-500">Small Value</p>
                    <p className="text-base font-medium">{formatCurrency(1234.56, selectedCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Medium Value</p>
                    <p className="text-base font-medium">{formatCurrency(123456.78, selectedCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Large Value</p>
                    <p className="text-base font-medium">{formatCurrency(1234567.89, selectedCurrency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Financial Savings</p>
                    <p className="text-base font-medium">{formatCurrency(35620, selectedCurrency)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
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