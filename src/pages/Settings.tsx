
import { AppHeader } from "@/components/layouts/AppHeader";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Settings = () => {
  return (
    <AppLayout>
      <AppHeader title="Settings" />
      <div className="p-6 overflow-auto">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              Configure system preferences and business settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Module</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                This section will include business information, user management, and system preferences.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
