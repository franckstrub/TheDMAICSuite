import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  secondaryValue?: string;
  change: number | null;
  changeLabel: string;
  icon: string;
  iconBgColor: "blue" | "green" | "yellow" | "purple" | "red" | "indigo";
}

export default function StatsCard({
  title,
  value,
  secondaryValue,
  change,
  changeLabel,
  icon,
  iconBgColor,
}: StatsCardProps) {
  // Determine the styling based on iconBgColor
  const iconBgColorMap = {
    blue: "bg-blue-100",
    green: "bg-green-100",
    yellow: "bg-yellow-100",
    purple: "bg-purple-100",
    red: "bg-red-100",
    indigo: "bg-indigo-100",
  };

  const iconColorMap = {
    blue: "text-blue-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
    purple: "text-purple-500",
    red: "text-red-500",
    indigo: "text-indigo-500",
  };

  const bgColorClass = iconBgColorMap[iconBgColor];
  const textColorClass = iconColorMap[iconBgColor];

  // Determine whether the change is positive or negative (if change is not null)
  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;
  
  // For some metrics like "improvement", negative change is good
  const isNegativeGood = changeLabel.includes("improvement");

  const changeColorClass = isPositive
    ? "text-green-500"
    : isNegative
    ? "text-green-500"
    : "text-gray-500";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <div className={cn("rounded-full p-2", bgColorClass)}>
            <i className={cn(`fas fa-${icon}`, textColorClass)}></i>
          </div>
        </div>
        <p className="text-2xl font-semibold">{value}</p>
        {secondaryValue && (
          <p className="text-sm text-gray-600 mt-1">{secondaryValue}</p>
        )}
        <div className="mt-2">
          {/* Only show change percentage if change is not null */}
          {change !== null && (
            <div className="flex items-center text-xs mb-1">
              <span className={cn("flex items-center", isNegativeGood && isNegative ? "text-green-500" : changeColorClass)}>
                {isPositive ? (
                  <ArrowUpIcon className="w-3 h-3 mr-1" />
                ) : isNegative ? (
                  <ArrowDownIcon className="w-3 h-3 mr-1" />
                ) : null}
                {Math.abs(change)}%
              </span>
            </div>
          )}
          
          {/* Always show the change label, with adjusted styling for better readability */}
          <div className="text-gray-600 text-xs leading-tight" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>
            {changeLabel}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
