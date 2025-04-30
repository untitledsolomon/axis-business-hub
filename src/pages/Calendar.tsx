
import { AppHeader } from "@/components/layouts/AppHeader";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Calendar = () => {
  return (
    <AppLayout>
      <AppHeader title="Calendar" />
      <div className="p-6 overflow-auto">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Business Calendar</CardTitle>
            <CardDescription>
              Schedule appointments, track deadlines, and manage business events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar Module</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                This section will include a calendar view, event management, and scheduling tools.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Calendar;
