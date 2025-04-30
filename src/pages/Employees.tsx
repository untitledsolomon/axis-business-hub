
import { AppHeader } from "@/components/layouts/AppHeader";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Employees = () => {
  return (
    <AppLayout>
      <AppHeader title="Employees" />
      <div className="p-6 overflow-auto">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Employee Management</CardTitle>
            <CardDescription>
              Manage employee profiles, track attendance, and handle payroll.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Employees Module</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                This section will include employee profiles, roles, and payroll management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Employees;
