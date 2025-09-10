import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  Plus, 
  Calendar, 
  User, 
  MessageSquare, 
  AlertTriangle,
  Target
} from "lucide-react";

interface PipCardsProps {
  pips?: any[];
  isLoading?: boolean;
}

export default function PipCards({ pips, isLoading }: PipCardsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

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
        description: "Automated coaching feedback has been sent.",
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

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusColor = (daysRemaining: number, progress: number) => {
    if (daysRemaining <= 3) return 'bg-destructive/10 text-destructive';
    if (daysRemaining <= 7) return 'bg-chart-3/10 text-chart-3';
    if (progress >= 80) return 'bg-accent/10 text-accent';
    return 'bg-primary/10 text-primary';
  };

  const getStatusText = (daysRemaining: number, progress: number) => {
    if (daysRemaining <= 0) return 'Expired';
    if (daysRemaining <= 3) return 'Critical';
    if (progress >= 80) return 'Improving';
    return 'In Progress';
  };

  const getProgressColor = (progress: number, daysRemaining: number) => {
    if (daysRemaining <= 3 && progress < 60) return 'bg-destructive';
    if (progress >= 80) return 'bg-accent';
    if (progress >= 60) return 'bg-chart-3';
    return 'bg-chart-3';
  };

  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Active PIP Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active PIP Management</CardTitle>
          <Button data-testid="button-create-new-pip">
            <Plus className="w-4 h-4 mr-2" />
            Create New PIP
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!pips || pips.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active PIPs</h3>
            <p className="text-muted-foreground mb-4">
              No Performance Improvement Plans are currently active.
            </p>
            <Button variant="outline" data-testid="button-upload-data-pip">
              Upload Performance Data
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pips.map((pip: any) => {
              const daysRemaining = getDaysRemaining(pip.endDate);
              const progress = pip.progress || 0;
              const statusColor = getStatusColor(daysRemaining, progress);
              const statusText = getStatusText(daysRemaining, progress);
              
              return (
                <Card 
                  key={pip.id} 
                  className="hover:shadow-lg transition-shadow"
                  data-testid={`pip-card-${pip.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm" data-testid={`pip-employee-name-${pip.id}`}>
                            {pip.employeeName || `Employee ${pip.employeeId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{pip.employeeId}</p>
                        </div>
                      </div>
                      <Badge 
                        className={statusColor}
                        data-testid={`pip-status-badge-${pip.id}`}
                      >
                        {statusText}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress 
                        value={progress} 
                        className="h-2"
                        data-testid={`pip-progress-bar-${pip.id}`}
                      />
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 mb-3">
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
                          <Calendar className="w-3 h-3" />
                        )}
                        <span 
                          className={daysRemaining <= 3 ? 'text-destructive font-medium' : ''}
                          data-testid={`pip-days-remaining-${pip.id}`}
                        >
                          Days remaining: {daysRemaining}
                        </span>
                      </div>
                    </div>

                    {(pip.initialScore || pip.currentScore) && (
                      <div className="text-xs space-y-1 mb-3 p-2 bg-muted rounded">
                        {pip.initialScore && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Initial Score:</span>
                            <span>{pip.initialScore}%</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Score:</span>
                          <span className={pip.currentScore > pip.initialScore ? 'text-accent font-medium' : ''}>
                            {pip.currentScore || pip.initialScore}%
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setLocation('/pips')}
                        data-testid={`button-view-pip-details-${pip.id}`}
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
                        data-testid={`button-send-coaching-${pip.id}`}
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
      </CardContent>
    </Card>
  );
}
