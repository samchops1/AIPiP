import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, ArrowUp, Minus, User } from "lucide-react";
import { useLocation } from "wouter";

interface EmployeeTableProps {
  employees?: any[];
  isLoading?: boolean;
}

export default function EmployeeTable({ employees, isLoading }: EmployeeTableProps) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const itemsPerPage = 5;
  const [, setLocation] = useLocation();

  const { data: performanceMetrics } = useQuery({
    queryKey: ['/api/performance-metrics'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getEmployeeMetrics = (employeeId: string) => {
    const empMetrics = (performanceMetrics as any[])?.filter((m: any) => m.employeeId === employeeId) || [];
    if (empMetrics.length === 0) return { latestScore: 0, trend: 0 };
    
    const sorted = empMetrics.sort((a: any, b: any) => b.period - a.period);
    const latestScore = sorted[0]?.score || 0;
    
    let trend = 0;
    if (sorted.length >= 2) {
      const current = sorted[0].score;
      const previous = sorted[1].score;
      trend = ((current - previous) / previous) * 100;
    }
    
    return { latestScore, trend };
  };

  const getStatusBadge = (employee: any, score: number) => {
    if (employee.status === "terminated") {
      return <Badge variant="destructive">Terminated</Badge>;
    }
    if (employee.status === "pip") {
      return <Badge className="bg-destructive/10 text-destructive">PIP Active</Badge>;
    }
    if (score >= 85) {
      return <Badge className="bg-accent/10 text-accent">Performing Well</Badge>;
    }
    if (score >= 70) {
      return <Badge className="bg-chart-3/10 text-chart-3">At Risk</Badge>;
    }
    return <Badge variant="secondary">Needs Attention</Badge>;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <ArrowUp className="w-3 h-3 text-accent" />;
    }
    if (trend < 0) {
      return <ArrowDown className="w-3 h-3 text-destructive" />;
    }
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const filteredEmployees = employees?.filter(employee => {
    if (filter === "high-risk") {
      const { latestScore } = getEmployeeMetrics(employee.id);
      return latestScore < 70 || employee.status === "pip";
    }
    return true;
  }) || [];

  const paginatedEmployees = filteredEmployees.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Employee Performance Overview</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant={filter === "high-risk" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filter === "high-risk" ? "all" : "high-risk")}
              data-testid="button-filter-high-risk"
            >
              High Risk
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export-data">
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-sm">Employee</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Score</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Trend</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    No employees found
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((employee: any) => {
                  const { latestScore, trend } = getEmployeeMetrics(employee.id);
                  
                  return (
                    <tr key={employee.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm" data-testid={`employee-name-${employee.id}`}>
                              {employee.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{employee.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium" data-testid={`employee-score-${employee.id}`}>
                            {Math.round(latestScore)}
                          </span>
                          <Progress 
                            value={latestScore} 
                            className="w-16 h-2"
                            data-testid={`employee-score-progress-${employee.id}`}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(employee, latestScore)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(trend)}
                          <span className={`text-sm ${
                            trend > 0 ? 'text-accent' : 
                            trend < 0 ? 'text-destructive' : 
                            'text-muted-foreground'
                          }`}>
                            {trend === 0 ? '0%' : `${trend > 0 ? '+' : ''}${Math.round(trend)}%`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setLocation(`/employee/${employee.id}`)}
                          data-testid={`button-view-details-${employee.id}`}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {filteredEmployees.length > itemsPerPage && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {page * itemsPerPage + 1} to {Math.min((page + 1) * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
