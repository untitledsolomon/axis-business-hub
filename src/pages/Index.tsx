
import { AppHeader } from "@/components/layouts/AppHeader";
import { AppLayout } from "@/components/layouts/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { InventoryStatus } from "@/components/dashboard/InventoryStatus";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DollarSign, PackageOpen, ShoppingCart, Users } from "lucide-react";

const Dashboard = () => {
  return (
    <AppLayout>
      <AppHeader title="Dashboard" />
      <div className="p-6 overflow-auto h-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard 
            title="Total Revenue" 
            value="$45,231.89" 
            icon={<DollarSign className="h-5 w-5 text-primary" />}
            trend={{ value: "12%", positive: true }}
          />
          <StatCard 
            title="Total Sales" 
            value="2,842" 
            icon={<ShoppingCart className="h-5 w-5 text-primary" />}
            trend={{ value: "5.4%", positive: true }}
          />
          <StatCard 
            title="Active Products" 
            value="540" 
            icon={<PackageOpen className="h-5 w-5 text-primary" />}
            trend={{ value: "10", positive: true }}
          />
          <StatCard 
            title="Team Members" 
            value="24" 
            icon={<Users className="h-5 w-5 text-primary" />}
            trend={{ value: "2", positive: true }}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <RevenueChart />
          <TopProducts />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InventoryStatus />
          <RecentActivity />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
