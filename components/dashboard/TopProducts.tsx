
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const products = [
  {
    name: "Premium Headphones",
    sales: 87,
    value: 8700,
    progress: 87,
  },
  {
    name: "Bluetooth Speaker",
    sales: 75,
    value: 7500,
    progress: 75,
  },
  {
    name: "Smart Watch",
    sales: 62,
    value: 6200,
    progress: 62,
  },
  {
    name: "Wireless Earbuds",
    sales: 50,
    value: 5000,
    progress: 50,
  },
  {
    name: "External SSD",
    sales: 45,
    value: 4500,
    progress: 45,
  },
];

export function TopProducts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.name} className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-muted-foreground">${product.value}</div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={product.progress} className="h-2" />
                <div className="text-sm text-muted-foreground whitespace-nowrap">{product.sales} sales</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
