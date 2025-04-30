
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Package, DollarSign, User, FileText } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "inventory",
    title: "New product added",
    description: "Premium Headphones added to inventory",
    time: "12:43 PM",
  },
  {
    id: 2,
    type: "sale",
    title: "New sale completed",
    description: "Order #38294 for $299.95",
    time: "10:30 AM",
  },
  {
    id: 3,
    type: "employee",
    title: "New employee joined",
    description: "Jane Smith joined as Sales Manager",
    time: "09:15 AM",
  },
  {
    id: 4,
    type: "invoice",
    title: "Invoice paid",
    description: "Invoice #12458 paid by Apple Inc.",
    time: "Yesterday",
  },
  {
    id: 5,
    type: "sale",
    title: "Large order received",
    description: "Bulk order from Microsoft Corp.",
    time: "Yesterday",
  },
];

export function RecentActivity() {
  const getIcon = (type: string) => {
    switch (type) {
      case "inventory":
        return <Package size={16} className="text-primary" />;
      case "sale":
        return <DollarSign size={16} className="text-axis-green" />;
      case "employee":
        return <User size={16} className="text-axis-blue" />;
      case "invoice":
        return <FileText size={16} className="text-axis-gray" />;
      default:
        return <DollarSign size={16} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={cn(
                "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full",
                activity.type === "inventory" && "bg-primary/10",
                activity.type === "sale" && "bg-axis-green/10",
                activity.type === "employee" && "bg-axis-blue/10", 
                activity.type === "invoice" && "bg-axis-gray/10"
              )}>
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{activity.title}</p>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
