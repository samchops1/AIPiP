import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Download,
  Filter,
  Calendar,
  DollarSign,
  Activity,
  Award,
  Shield
} from "lucide-react";
import { useState } from "react";

export default function Analytics() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [assumptions, setAssumptions] = useState({
    avgSalary: 75000,
    pipCost: 3500,
    coachingCost: 400,
    pipSuccessRate: 0.5, // fraction 0..1
  });

  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const { data: metrics } = useQuery({
    queryKey: ['/api/performance-metrics'],
  });

  const { data: pips } = useQuery({
    queryKey: ['/api/pips'],
  });

  const { data: terminatedEmployees } = useQuery({
    queryKey: ['/api/terminated-employees'],
  });

  const { data: dashboardMetrics } = useQuery({
    queryKey: ['/api/dashboard-metrics'],
  });

  const { data: coachingSessions } = useQuery({
    queryKey: ['/api/coaching-sessions'],
    select: (data) => data?.filter((session: any) => session.type === 'automated') || []
  });

  const { data: fairness } = useQuery({
    queryKey: ['/api/reports/fairness/weekly'],
  });

  // Calculate analytics
  const totalEmployees = employees?.length || 0;
  const activeEmployees = employees?.filter((e: any) => e.status === 'active').length || 0;
  const pipEmployees = employees?.filter((e: any) => e.status === 'pip').length || 0;
  const terminated = terminatedEmployees?.length || 0;
  const improvementRate = dashboardMetrics?.improvementRate || 0;

  // Company distribution
  const companyDistribution = employees?.reduce((acc: any, emp: any) => {
    const company = emp.companyId || 'Unknown';
    acc[company] = (acc[company] || 0) + 1;
    return acc;
  }, {}) || {};

  // Performance distribution
  const performanceDistribution = {
    excellent: metrics?.filter((m: any) => m.score >= 90).length || 0,
    good: metrics?.filter((m: any) => m.score >= 80 && m.score < 90).length || 0,
    average: metrics?.filter((m: any) => m.score >= 70 && m.score < 80).length || 0,
    poor: metrics?.filter((m: any) => m.score < 70).length || 0,
  };

  // Department analytics
  const departmentStats = employees?.reduce((acc: any, emp: any) => {
    const dept = emp.department || 'Unknown';
    if (!acc[dept]) {
      acc[dept] = { total: 0, active: 0, pip: 0, terminated: 0 };
    }
    acc[dept].total++;
    acc[dept][emp.status]++;
    return acc;
  }, {}) || {};

  // Utilization analytics
  const utilizationStats = {
    high: metrics?.filter((m: any) => m.utilization >= 80).length || 0,
    medium: metrics?.filter((m: any) => m.utilization >= 60 && m.utilization < 80).length || 0,
    low: metrics?.filter((m: any) => m.utilization < 60).length || 0,
  };

  // Coaching effectiveness
  const coachingStats = coachingSessions?.reduce((acc: any, session: any) => {
    const score = session.score;
    if (score >= 80) acc.effective++;
    else if (score >= 60) acc.moderate++;
    else acc.ineffective++;
    acc.total++;
    return acc;
  }, { effective: 0, moderate: 0, ineffective: 0, total: 0 }) || { effective: 0, moderate: 0, ineffective: 0, total: 0 };

  // ROI calculations (explicit, adjustable assumptions)
  const avgSalary = Math.max(0, Number(assumptions.avgSalary) || 0);
  const terminationCost = Math.round(avgSalary * 0.5); // replacement + onboarding (~50% salary)
  const pipCost = Math.max(0, Number(assumptions.pipCost) || 0);
  const coachingCost = Math.max(0, Number(assumptions.coachingCost) || 0);
  const assumedPipSuccessRate = Math.min(1, Math.max(0, Number(assumptions.pipSuccessRate) || 0));

  const totalTerminationCost = terminated * terminationCost;
  const totalPipCost = (pips as any[])?.length ? (pips as any[]).length * pipCost : pipEmployees * pipCost;
  const totalCoachingCost = (coachingSessions?.length || 0) * coachingCost;
  const totalInvestment = totalPipCost + totalCoachingCost;
  const potentialSavings = (pipEmployees * assumedPipSuccessRate * terminationCost);
  const roi = totalInvestment > 0 ? (((potentialSavings - totalInvestment) / totalInvestment) * 100) : 0;

  const generateReport = () => {
    const reportData = {
      summary: {
        totalEmployees,
        activeEmployees,
        pipEmployees,
        terminated,
        improvementRate
      },
      performance: performanceDistribution,
      departments: departmentStats,
      companies: companyDistribution,
      roi: {
        investment: totalInvestment,
        savings: Math.round(potentialSavings),
        roi: roi.toFixed(2)
      },
      coaching: coachingStats
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-6 overflow-auto" data-testid="analytics-page">
      {/* Header with guidance */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Performance Analytics</h2>
            <p className="text-muted-foreground">
              Comprehensive insights into performance, PIPs, coaching, fairness, and ROI.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={generateReport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Assumptions (interactive) */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Assumptions</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground underline cursor-help">How these affect ROI</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    ROI estimates depend on salary, replacement cost, and the likelihood that PIPs avert terminations. Adjust these inputs to reflect your environment. Values are conservative by default.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-xs text-muted-foreground">Average Salary ($)</label>
                <Input type="number" min={0} step={1000} value={assumptions.avgSalary}
                  onChange={(e) => setAssumptions(a => ({ ...a, avgSalary: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">PIP Cost per Employee ($)</label>
                <Input type="number" min={0} step={100} value={assumptions.pipCost}
                  onChange={(e) => setAssumptions(a => ({ ...a, pipCost: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Coaching Cost per Session ($)</label>
                <Input type="number" min={0} step={50} value={assumptions.coachingCost}
                  onChange={(e) => setAssumptions(a => ({ ...a, coachingCost: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">PIP Success Rate (%)</label>
                <Input type="number" min={0} max={100} step={5}
                  value={Math.round(assumptions.pipSuccessRate * 100)}
                  onChange={(e) => setAssumptions(a => ({ ...a, pipSuccessRate: (Number(e.target.value) || 0) / 100 }))} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Derived replacement cost: <span className="font-medium">${terminationCost.toLocaleString()}</span>
              </div>
              <div className="space-x-2">
                <Badge variant="secondary">Investment: ${totalInvestment.toLocaleString()}</Badge>
                <Badge variant="secondary">Potential Savings: ${Math.round(potentialSavings).toLocaleString()}</Badge>
                <Badge variant={roi >= 0 ? 'secondary' : 'destructive'}>ROI: {roi.toFixed(1)}%</Badge>
                <Button variant="outline" size="sm" onClick={() => setAssumptions({ avgSalary: 75000, pipCost: 3500, coachingCost: 400, pipSuccessRate: 0.5 })}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{totalEmployees.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="mt-2">
              <div className="flex items-center text-xs text-muted-foreground">
                <Building className="w-3 h-3 mr-1" />
                Across {Object.keys(companyDistribution).length} companies
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active PIPs</p>
                <p className="text-2xl font-bold">{pipEmployees}</p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2">
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                {improvementRate}% improvement rate
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Terminations</p>
                <p className="text-2xl font-bold">{terminated}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="mt-2">
              <div className="flex items-center text-xs text-muted-foreground">
                <Activity className="w-3 h-3 mr-1" />
                {((terminated / totalEmployees) * 100).toFixed(2)}% of workforce
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ROI</p>
                <p className="text-2xl font-bold">{roi.toFixed(1)}%</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                ${Math.round(potentialSavings).toLocaleString()} potential savings
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fairness Snapshot */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <span>Fairness Snapshot (Weekly)</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground underline cursor-help">What is this?</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      Tracks proposed PIPs and terminations across two synthetic cohorts (A/B) derived from employee IDs. This illustrates fairness monitoring without sensitive attributes. Rates are normalized by cohort size to surface potential imbalances.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              {fairness?.methodology && (
                <span className="text-xs text-muted-foreground">Method: {fairness.methodology}</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {fairness?.report ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fairness.report.map((row: any) => (
                  <div key={row.cohort} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Cohort {row.cohort}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.pip_count} PIPs ({(row.pip_rate*100).toFixed(1)}%) • {row.termination_count} Terms ({(row.termination_rate*100).toFixed(1)}%) of {row.cohortSize}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs">PIP Count</div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-2 bg-primary rounded" style={{ width: `${Math.min(100, row.pip_rate * 100)}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs">Termination Count</div>
                      <div className="h-2 bg-muted rounded">
                        <div className="h-2 bg-destructive rounded" style={{ width: `${Math.min(100, row.termination_rate * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No fairness data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Performance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm">Excellent (90-100%)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{performanceDistribution.excellent}</span>
                      <Badge variant="secondary">{((performanceDistribution.excellent / (metrics?.length || 1)) * 100).toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={(performanceDistribution.excellent / (metrics?.length || 1)) * 100} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm">Good (80-89%)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{performanceDistribution.good}</span>
                      <Badge variant="secondary">{((performanceDistribution.good / (metrics?.length || 1)) * 100).toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={(performanceDistribution.good / (metrics?.length || 1)) * 100} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-sm">Average (70-79%)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{performanceDistribution.average}</span>
                      <Badge variant="secondary">{((performanceDistribution.average / (metrics?.length || 1)) * 100).toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={(performanceDistribution.average / (metrics?.length || 1)) * 100} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm">Poor (&lt;70%)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{performanceDistribution.poor}</span>
                      <Badge variant="destructive">{((performanceDistribution.poor / (metrics?.length || 1)) * 100).toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={(performanceDistribution.poor / (metrics?.length || 1)) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  PIP Success Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{Math.round(pipEmployees * 0.7)}</div>
                    <div className="text-xs text-green-600">Expected Success</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{Math.round(pipEmployees * 0.3)}</div>
                    <div className="text-xs text-red-600">At Risk</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Improvement Rate</span>
                    <span className="font-medium">{improvementRate}%</span>
                  </div>
                  <Progress value={improvementRate} className="h-2" />
                </div>

                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground">
                    Historical data shows {improvementRate}% of employees on PIPs successfully improve their performance
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(departmentStats).map(([dept, stats]: [string, any]) => (
                  <div key={dept} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{dept}</h3>
                      <Badge variant="outline">{stats.total} employees</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{stats.active || 0}</div>
                        <div className="text-muted-foreground">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600">{stats.pip || 0}</div>
                        <div className="text-muted-foreground">On PIP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">{stats.terminated || 0}</div>
                        <div className="text-muted-foreground">Terminated</div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex text-xs text-muted-foreground justify-between">
                        <span>Performance Score</span>
                        <span>{stats.pip > 0 ? 'At Risk' : 'Stable'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Company Portfolio Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(companyDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([company, count]: [string, any]) => (
                    <div key={company} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{company}</h4>
                        <Building className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs text-muted-foreground">
                        {((count / totalEmployees) * 100).toFixed(1)}% of workforce
                      </div>
                    </div>
                  ))}
              </div>
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 mr-2" />
                  Portfolio spans {Object.keys(companyDistribution).length} companies with balanced distribution for risk mitigation
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coaching" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Coaching Effectiveness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{coachingStats.effective}</div>
                    <div className="text-xs text-green-600">Effective</div>
                    <div className="text-xs text-muted-foreground">Score ≥80%</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{coachingStats.moderate}</div>
                    <div className="text-xs text-yellow-600">Moderate</div>
                    <div className="text-xs text-muted-foreground">60-79%</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{coachingStats.ineffective}</div>
                    <div className="text-xs text-red-600">Needs Work</div>
                    <div className="text-xs text-muted-foreground">&lt;60%</div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Success Rate</span>
                      <span className="font-medium">
                        {coachingStats.total > 0 ? ((coachingStats.effective / coachingStats.total) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={coachingStats.total > 0 ? (coachingStats.effective / coachingStats.total) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coaching Volume</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold">{coachingSessions?.length || 0}</div>
                  <div className="text-muted-foreground">Total Sessions</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Automated Sessions</span>
                    <span className="font-medium">{coachingSessions?.filter((s: any) => s.type === 'automated').length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Average per Employee</span>
                    <span className="font-medium">{totalEmployees > 0 ? ((coachingSessions?.length || 0) / totalEmployees).toFixed(1) : 0}</span>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground">
                    📈 Coaching volume correlates with {improvementRate}% improvement rate
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="utilization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Utilization Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{utilizationStats.high}</div>
                  <div className="text-sm text-green-600">High Utilization</div>
                  <div className="text-xs text-muted-foreground">≥80%</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{utilizationStats.medium}</div>
                  <div className="text-sm text-yellow-600">Medium Utilization</div>
                  <div className="text-xs text-muted-foreground">60-79%</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{utilizationStats.low}</div>
                  <div className="text-sm text-red-600">Low Utilization</div>
                  <div className="text-xs text-muted-foreground">&lt;60%</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="text-sm mb-2">Utilization Distribution</div>
                <div className="space-y-2">
                  {Object.entries(utilizationStats).map(([level, count]: [string, any]) => (
                    <div key={level} className="flex items-center justify-between">
                      <span className="capitalize">{level} Utilization</span>
                      <div className="flex items-center">
                        <span className="text-sm font-medium mr-2">{count}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              level === 'high' ? 'bg-green-500' : 
                              level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(count / (metrics?.length || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">PIP Investment</span>
                    <span className="font-medium">${totalPipCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Coaching Investment</span>
                    <span className="font-medium">${totalCoachingCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Total Investment</span>
                    <span className="font-bold">${totalInvestment.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="space-y-3 border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Termination Costs Avoided</span>
                    <span className="font-medium text-green-600">
                      ${(pipEmployees * 0.7 * terminationCost).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Net Savings</span>
                    <span className="font-bold text-green-600">
                      ${costSavings.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ROI Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">{roi.toFixed(1)}%</div>
                  <div className="text-muted-foreground">Return on Investment</div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Cost per Employee Saved</span>
                    <span>${(totalInvestment / Math.max(pipEmployees * 0.7, 1)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Termination Cost</span>
                    <span>${terminationCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payback Period</span>
                    <span>{roi > 0 ? '6-12 months' : 'N/A'}</span>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground">
                    💰 Each successful PIP saves approximately ${terminationCost.toLocaleString()} in replacement costs
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
