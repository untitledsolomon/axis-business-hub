
import { AppHeader } from "@/components/layouts/AppHeader";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Accounting = () => {
  return (
    <AppLayout>
      <AppHeader title="Accounting" />
      <div className="p-6 overflow-auto">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Accounting & Finance</CardTitle>
            <CardDescription>
              Manage finances, track expenses, and generate financial reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Accounting Module</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                This section will include financial records, expense tracking, and financial reports.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Accounting;
