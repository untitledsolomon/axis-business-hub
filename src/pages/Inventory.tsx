
import { AppHeader } from "@/components/layouts/AppHeader";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Inventory = () => {
  return (
    <AppLayout>
      <AppHeader title="Inventory" />
      <div className="p-6 overflow-auto">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Inventory Management</CardTitle>
            <CardDescription>
              Manage your products, track stock levels, and monitor inventory movements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Inventory Module</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                This section will include product listings, stock levels, categories, and inventory operations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Inventory;
