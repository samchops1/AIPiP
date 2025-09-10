import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, TrendingUp, Bot } from "lucide-react";

interface MetricsCardsProps {
  metrics?: {
    totalEmployees: number;
    activePIPs: number;
    improvementRate: number;
    autoActionsToday: number;
  };
  isLoading?: boolean;
}

export default function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Employees",
      value: metrics?.totalEmployees || 0,
      change: "+12 this month",
      icon: Users,
      color: "text-chart-1"
    },
    {
      title: "Active PIPs",
      value: metrics?.activePIPs || 0,
      change: "5 expiring this week",
      icon: AlertTriangle,
      color: "text-chart-3"
    },
    {
      title: "Improvement Rate",
      value: `${metrics?.improvementRate || 0}%`,
      change: "+8% vs last quarter",
      icon: TrendingUp,
      color: "text-chart-2"
    },
    {
      title: "Auto Actions Today",
      value: metrics?.autoActionsToday || 0,
      change: "12 PIPs, 35 coaching",
      icon: Bot,
      color: "text-chart-4"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <Card key={index} data-testid={`metric-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </h3>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold" data-testid={`metric-value-${index}`}>
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {card.change}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
