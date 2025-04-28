import { cn } from "@/lib/utils";

interface ActivityItemProps {
  type: "data-import" | "phase-completed" | "comment" | "alert" | "report";
  title: string;
  description: string;
  time: string;
}

export default function ActivityItem({
  type,
  title,
  description,
  time,
}: ActivityItemProps) {
  // Define icon and color based on activity type
  const getIconConfig = () => {
    switch (type) {
      case "data-import":
        return {
          bgColor: "bg-blue-100",
          textColor: "text-blue-500",
          icon: "fas fa-file-upload",
        };
      case "phase-completed":
        return {
          bgColor: "bg-green-100",
          textColor: "text-green-500",
          icon: "fas fa-check",
        };
      case "comment":
        return {
          bgColor: "bg-purple-100",
          textColor: "text-purple-500",
          icon: "fas fa-comment-alt",
        };
      case "alert":
        return {
          bgColor: "bg-yellow-100",
          textColor: "text-yellow-500",
          icon: "fas fa-exclamation",
        };
      case "report":
        return {
          bgColor: "bg-red-100",
          textColor: "text-red-500",
          icon: "fas fa-chart-pie",
        };
      default:
        return {
          bgColor: "bg-gray-100",
          textColor: "text-gray-500",
          icon: "fas fa-info-circle",
        };
    }
  };

  const { bgColor, textColor, icon } = getIconConfig();

  return (
    <div className="flex">
      <div className="flex-shrink-0 w-8 mt-1">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            bgColor
          )}
        >
          <i className={cn(icon, textColor, "text-sm")}></i>
        </div>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}
