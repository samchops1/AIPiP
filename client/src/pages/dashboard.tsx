import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MetricsCards from "@/components/dashboard/metrics-cards";
import EmployeeTable from "@/components/dashboard/employee-table";
import RecentActions from "@/components/dashboard/recent-actions";
import PipCards from "@/components/dashboard/pip-cards";
import AutoFiringModal from "@/components/modals/auto-firing-modal";
import TerminatedEmployeeModal from "@/components/modals/terminated-employee-modal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, FileText, Database, Trash2, AlertTriangle, Users } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { toast } = useToast();
  const [showAutoFiringModal, setShowAutoFiringModal] = useState(false);
  const [terminatedEmployeesData, setTerminatedEmployeesData] = useState<any[]>([]);
  const [showTerminatedModal, setShowTerminatedModal] = useState(false);
  const [selectedTerminatedEmployee, setSelectedTerminatedEmployee] = useState(null);
  const [role, setRole] = useState<string>(() => (typeof window !== 'undefined' ? (window.localStorage.getItem('demoRole') || 'hr') : 'hr'));

  useEffect(() => {
    const updateRole = (e: any) => setRole(e?.detail || (window.localStorage.getItem('demoRole') || 'viewer'));
    const storageListener = () => setRole(window.localStorage.getItem('demoRole') || 'hr');
    window.addEventListener('demoRoleChanged', updateRole as any);
    window.addEventListener('storage', storageListener);
    // initial sync
    setRole(window.localStorage.getItem('demoRole') || 'hr');
    return () => {
      window.removeEventListener('demoRoleChanged', updateRole as any);
      window.removeEventListener('storage', storageListener);
    };
  }, []);

  const { data: dashboardMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/dashboard-metrics'],
  });

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/employees'],
  });

  const { data: activePips, isLoading: pipsLoading } = useQuery({
    queryKey: ['/api/pips'],
    queryFn: async () => {
      const response = await fetch('/api/pips?active=true');
      if (!response.ok) throw new Error('Failed to fetch PIPs');
      return response.json();
    }
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['/api/audit-logs'],
  });

  const { data: terminatedEmployees, isLoading: terminatedLoading } = useQuery({
    queryKey: ['/api/terminated-employees'],
  });

  const generateSampleDataMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/sample-data/generate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/performance-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs'] });
      toast({
        title: 'Sample data generated',
        description: 'Created 1000+ employees with realistic performance patterns'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate sample data',
        variant: 'destructive'
      });
    }
  });

  const clearDataMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/sample-data/clear'),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: 'Data cleared',
        description: 'All sample data has been removed'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to clear data',
        variant: 'destructive'
      });
    }
  });

  const autoFireMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/auto-fire/demo'),
    onSuccess: async (data: any) => {
      try {
        // Add a small delay to ensure auto-firing process has completed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch all terminated employees to show in modal, not just newly terminated ones
        const allTerminated: any[] = await apiRequest('GET', '/api/terminated-employees');
        
        // Transform the data structure to match what AutoFiringModal expects
        const transformedEmployees = Array.isArray(allTerminated) ? allTerminated.map((emp: any) => ({
          id: emp.employeeId,
          name: emp.employeeName,
          role: emp.role || "Employee", // fallback if role not available
          finalScore: emp.finalScore,
          finalUtilization: emp.finalUtilization,
          reason: emp.terminationReason,
          terminationLetter: emp.terminationLetter
        })) : [];
        
        setTerminatedEmployeesData(transformedEmployees);
        setShowAutoFiringModal(true); // Open modal after successful data fetch
      } catch (error) {
        // Fall back to newly terminated employees from the auto-fire response
        console.error('Failed to fetch all terminated employees:', error);
        setTerminatedEmployeesData(data.terminated || []);
        setShowAutoFiringModal(true); // Open modal even with fallback data
        toast({
          title: 'Warning',
          description: 'Could not load all terminated employees. Showing recently terminated only.',
          variant: 'destructive'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/terminated-employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to execute auto-firing',
        variant: 'destructive'
      });
    }
  });

  return (
    <div className="flex-1 p-6 overflow-auto" data-testid="dashboard-content">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2" data-testid="dashboard-title">
          Performance Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          AI-driven talent management overview
        </p>
      </div>

      <MetricsCards metrics={dashboardMetrics as any} isLoading={metricsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <EmployeeTable employees={employees as any[]} isLoading={employeesLoading} />
        </div>
        
        <div className="space-y-6">
          <RecentActions auditLogs={auditLogs as any[]} />
          
          {/* Sample Data Widget */}
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center">
                <span>Sample Data</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-2 text-xs underline cursor-help text-muted-foreground">What is this?</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      Generates a realistic demo dataset (employees, metrics, PIPs, sessions) so you can explore features quickly. Safe to run multiple times; use Clear to reset.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center">
                <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Generate realistic demo data to explore the system
                </p>
                <div className="flex flex-col gap-2">
                  <TooltipProvider><Tooltip><TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    onClick={() => generateSampleDataMutation.mutate()}
                    disabled={generateSampleDataMutation.isPending}
                    data-testid="button-generate-sample"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Generate Sample Data
                  </Button>
                  </TooltipTrigger><TooltipContent>Creates demo records to populate the dashboard.</TooltipContent></Tooltip></TooltipProvider>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => clearDataMutation.mutate()}
                    disabled={clearDataMutation.isPending}
                    data-testid="button-clear-data"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Includes: 1000+ employees, performance metrics, active PIPs, coaching sessions
              </div>
            </div>
          </div>

          {/* Auto-Firing Widget */}
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                Auto-Firing System
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-2 text-xs underline cursor-help text-muted-foreground">How it works</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      Demonstrates automated termination based on consecutive low performance/utilization. HR role required.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Demonstrate automated termination based on performance and utilization
                </p>
                {role === 'hr' ? (
                  <TooltipProvider><Tooltip><TooltipTrigger asChild>
                  <Button 
                    variant="destructive"
                    size="sm" 
                    onClick={() => autoFireMutation.mutate()}
                    disabled={autoFireMutation.isPending}
                    data-testid="button-auto-fire"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Execute Auto-Firing
                  </Button>
                  </TooltipTrigger><TooltipContent>Runs the evaluation and shows who would be terminated.</TooltipContent></Tooltip></TooltipProvider>
                ) : (
                  <div className="text-xs text-muted-foreground">HR role required to execute</div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Evaluates employees with consistent poor performance and low utilization
              </div>
            </div>
          </div>

          {/* Terminated Employees Widget */}
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center">
                <Users className="w-4 h-4 mr-2 text-red-500" />
                Terminated Employees ({(terminatedEmployees as any[])?.length || 0})
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-2 text-xs underline cursor-help text-muted-foreground">What is this?</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      Shows employees terminated by the automated evaluation or manual processes. Click a row to view the termination letter and details.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {terminatedLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (terminatedEmployees as any[])?.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(terminatedEmployees as any[]).map((emp: any) => (
                    <div 
                      key={emp.id} 
                      className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                      onClick={() => {
                        setSelectedTerminatedEmployee(emp);
                        setShowTerminatedModal(true);
                      }}
                    >
                      <div className="text-sm font-medium">{emp.employeeName}</div>
                      <div className="text-xs text-muted-foreground">
                        Score: {emp.finalScore}% | Utilization: {emp.finalUtilization}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Terminated: {new Date(emp.terminationDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-blue-600 hover:text-blue-800 mt-1">
                        Click for details →
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No terminated employees
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Data Upload Widget */}
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center">
                <span>Quick Data Upload</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-2 text-xs underline cursor-help text-muted-foreground">How to use</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      Upload a CSV with employee metrics to evaluate PIPs on real data. Columns: employee_id, period, score, utilization, tasks_completed, date.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
            </div>
            <div className="p-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Upload employee performance CSV
                </p>
                <Link href="/data-upload">
                  <Button size="sm" data-testid="button-upload-quick">
                    <Upload className="w-4 h-4 mr-2" />
                    Select File
                  </Button>
                </Link>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">
                  Supported format: CSV with employee_id, score, tasks_completed, date columns
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PipCards pips={activePips} isLoading={pipsLoading} />

      {/* Auto-Firing Modal */}
      <AutoFiringModal
        isOpen={showAutoFiringModal}
        onClose={() => setShowAutoFiringModal(false)}
        employees={terminatedEmployeesData}
      />
      
      {/* Terminated Employee Details Modal */}
      <TerminatedEmployeeModal
        isOpen={showTerminatedModal}
        onClose={() => setShowTerminatedModal(false)}
        employee={selectedTerminatedEmployee}
      />
    </div>
  );
}
