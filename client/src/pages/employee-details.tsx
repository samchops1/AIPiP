import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, User, TrendingUp, Calendar, FileText } from "lucide-react";
import { Link } from "wouter";

export default function EmployeeDetails() {
  const [match, params] = useRoute("/employee/:id");
  const employeeId = params?.id;

  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ['/api/performance-metrics'],
  });

  const { data: pips } = useQuery({
    queryKey: ['/api/pips'],
  });

  const { data: coachingSessions } = useQuery({
    queryKey: ['/api/coaching-sessions'],
  });

  if (!match || !employeeId) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Employee Not Found</h2>
          <Link href="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const employee = (employees as any[])?.find(emp => emp.id === employeeId);
  const employeeMetrics = (performanceMetrics as any[])?.filter(m => m.employeeId === employeeId) || [];
  const employeePips = (pips as any[])?.filter(p => p.employeeId === employeeId) || [];
  const employeeCoaching = (coachingSessions as any[])?.filter(c => c.employeeId === employeeId) || [];

  const latestMetrics = employeeMetrics.sort((a, b) => b.period - a.period).slice(0, 12);
  const latestScore = latestMetrics[0]?.score || 0;
  const latestUtilization = latestMetrics[0]?.utilization || 0;

  const getStatusBadge = (status: string, score: number) => {
    if (status === "terminated") {
      return <Badge variant="destructive">Terminated</Badge>;
    }
    if (status === "pip") {
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

  if (!employee) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Employee Not Found</h2>
          <Link href="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto" data-testid="employee-details-content">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="employee-name">
              {employee.name}
            </h1>
            <p className="text-muted-foreground">
              {employee.role} • {employee.department}
            </p>
            <div className="mt-2">
              {getStatusBadge(employee.status, latestScore)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Overview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Latest Performance Score</div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold" data-testid="latest-score">
                      {Math.round(latestScore)}%
                    </span>
                    <Progress value={latestScore} className="flex-1 h-3" />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Latest Utilization</div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold" data-testid="latest-utilization">
                      {Math.round(latestUtilization)}%
                    </span>
                    <Progress value={latestUtilization} className="flex-1 h-3" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Recent Performance History</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {latestMetrics.map((metric, index) => (
                    <div key={metric.period} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(metric.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          Score: <span className="font-medium">{metric.score}%</span>
                        </div>
                        <div className="text-sm">
                          Utilization: <span className="font-medium">{metric.utilization}%</span>
                        </div>
                        <div className="text-sm">
                          Tasks: <span className="font-medium">{metric.tasksCompleted}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active PIPs */}
          {employeePips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Performance Improvement Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employeePips.map((pip: any) => (
                    <div key={pip.id} className="p-3 border border-border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={pip.status === 'active' ? 'destructive' : 'secondary'}>
                          {pip.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(pip.progress || 0)}% progress
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Start: {new Date(pip.startDate).toLocaleDateString()}</div>
                        <div>End: {new Date(pip.endDate).toLocaleDateString()}</div>
                        <div>Current Score: {pip.currentScore}%</div>
                      </div>
                      <Progress value={pip.progress || 0} className="mt-2 h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Coaching */}
          {employeeCoaching.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Coaching Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {employeeCoaching
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((session: any) => (
                    <div key={session.id} className="p-3 border border-border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={session.type === 'automated' ? 'secondary' : 'default'}>
                          {session.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.feedback}
                      </p>
                      {session.score && (
                        <div className="mt-2 text-sm">
                          Score: <span className="font-medium">{session.score}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employee Info */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Employee ID:</span>
                  <span className="ml-2 font-medium">{employee.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-2 font-medium">{employee.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <span className="ml-2 font-medium">{employee.department}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span>
                  <span className="ml-2 font-medium">{employee.role}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium">{employee.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}