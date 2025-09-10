import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  User,
  Target
} from "lucide-react";

export default function PipManagement() {
  const [selectedPip, setSelectedPip] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activePips, isLoading } = useQuery({
    queryKey: ['/api/pips'],
    queryFn: async () => {
      const response = await fetch('/api/pips?active=true');
      if (!response.ok) throw new Error('Failed to fetch PIPs');
      return response.json();
    }
  });

  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const generateCoachingMutation = useMutation({
    mutationFn: async ({ employeeId, score, pipId }: any) => {
      const response = await apiRequest("POST", "/api/generate-coaching", {
        employeeId,
        score,
        pipId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Coaching Generated",
        description: "Automated coaching feedback has been sent to the employee.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/coaching-sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Coaching Failed",
        description: error.message || "Failed to generate coaching",
        variant: "destructive",
      });
    },
  });

  const getEmployeeName = (employeeId: string) => {
    const employee = (employees as any[])?.find((e: any) => e.id === employeeId);
    return employee?.name || employeeId;
  };

  const getStatusColor = (status: string, daysRemaining?: number) => {
    if (status === 'completed') return 'bg-accent/10 text-accent';
    if (status === 'terminated') return 'bg-destructive/10 text-destructive';
    if (daysRemaining && daysRemaining <= 3) return 'bg-destructive/10 text-destructive';
    if (daysRemaining && daysRemaining <= 7) return 'bg-chart-3/10 text-chart-3';
    return 'bg-primary/10 text-primary';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-accent';
    if (progress >= 60) return 'bg-chart-3';
    return 'bg-destructive';
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto" data-testid="pip-management-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">PIP Management</h2>
            <p className="text-sm text-muted-foreground">
              Monitor and manage Performance Improvement Plans
            </p>
          </div>
          <Button data-testid="button-create-pip">
            <Plus className="w-4 h-4 mr-2" />
            Create New PIP
          </Button>
        </div>
      </div>

      {!activePips || activePips.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active PIPs</h3>
            <p className="text-muted-foreground mb-4">
              No Performance Improvement Plans are currently active.
            </p>
            <Button variant="outline" data-testid="button-upload-data">
              Upload Performance Data
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePips.map((pip: any) => {
            const daysRemaining = getDaysRemaining(pip.endDate);
            const progress = pip.progress || 0;
            
            return (
              <Card key={pip.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm" data-testid={`pip-employee-${pip.employeeId}`}>
                          {getEmployeeName(pip.employeeId)}
                        </p>
                        <p className="text-xs text-muted-foreground">{pip.employeeId}</p>
                      </div>
                    </div>
                    <Badge 
                      className={getStatusColor(pip.status, daysRemaining)}
                      data-testid={`pip-status-${pip.id}`}
                    >
                      {daysRemaining <= 0 ? 'Expired' : 
                       daysRemaining <= 3 ? 'Critical' :
                       daysRemaining <= 7 ? 'At Risk' : 'In Progress'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress 
                      value={progress} 
                      className="h-2"
                      data-testid={`pip-progress-${pip.id}`}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3 h-3" />
                      <span>Started: {pip.startDate}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3 h-3" />
                      <span>Expires: {pip.endDate}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {daysRemaining <= 3 ? (
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                      ) : (
                        <TrendingUp className="w-3 h-3" />
                      )}
                      <span className={daysRemaining <= 3 ? 'text-destructive font-medium' : ''}>
                        Days remaining: {Math.max(0, daysRemaining)}
                      </span>
                    </div>
                  </div>

                  {pip.initialScore && pip.currentScore && (
                    <div className="text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Initial Score:</span>
                        <span>{pip.initialScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Score:</span>
                        <span className={pip.currentScore > pip.initialScore ? 'text-accent' : ''}>
                          {pip.currentScore}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setSelectedPip(pip)}
                      data-testid={`button-view-details-${pip.id}`}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => generateCoachingMutation.mutate({
                        employeeId: pip.employeeId,
                        score: pip.currentScore || pip.initialScore || 60,
                        pipId: pip.id
                      })}
                      disabled={generateCoachingMutation.isPending}
                      data-testid={`button-coaching-${pip.id}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedPip && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>PIP Details - {getEmployeeName(selectedPip.employeeId)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Goals</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {selectedPip.goals.map((goal: string, index: number) => (
                    <li key={index}>• {goal}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Coaching Plan</h4>
                <p className="text-sm text-muted-foreground">{selectedPip.coachingPlan}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedPip(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
