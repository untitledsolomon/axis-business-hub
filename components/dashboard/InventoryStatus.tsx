
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar } from "recharts";

const data = [
  { name: "Category A", current: 40, min: 10 },
  { name: "Category B", current: 25, min: 20 },
  { name: "Category C", current: 12, min: 15 },
  { name: "Category D", current: 35, min: 10 },
  { name: "Category E", current: 8, min: 12 },
  { name: "Category F", current: 22, min: 8 },
];

export function InventoryStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Status</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false}
              tickMargin={10}
              fontSize={12}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tickMargin={10}
            />
            <Tooltip
              contentStyle={{ 
                borderRadius: "8px", 
                border: "none",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" 
              }}
            />
            <Bar dataKey="current" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="min" fill="#64748B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
