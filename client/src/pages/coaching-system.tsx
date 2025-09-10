import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import CoachingFeedbackModal from "@/components/modals/coaching-feedback-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  User, 
  Calendar, 
  TrendingUp,
  Send,
  Search,
  Download
} from "lucide-react";
// @ts-ignore
import jsPDF from 'jspdf';

export default function CoachingSystem() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
  });

  const { data: activePips } = useQuery({
    queryKey: ['/api/pips'],
    queryFn: async () => {
      const response = await fetch('/api/pips?active=true');
      if (!response.ok) throw new Error('Failed to fetch PIPs');
      return response.json();
    }
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ['/api/performance-metrics'],
  });

  const { data: coachingSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/coaching-sessions', selectedEmployeeId],
    queryFn: async () => {
      if (!selectedEmployeeId) return [];
      const response = await fetch(`/api/coaching-sessions?employeeId=${selectedEmployeeId}`);
      if (!response.ok) throw new Error('Failed to fetch coaching sessions');
      return response.json();
    },
    enabled: !!selectedEmployeeId
  });

  const generateCoachingMutation = useMutation({
    mutationFn: async ({ employeeId, score }: any) => {
      const response = await apiRequest("POST", "/api/generate-coaching", {
        employeeId,
        score: parseFloat(score)
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      const employee = (employees as any[])?.find((e: any) => e.id === variables.employeeId);
      if (employee) {
        setModalData({
          employee: {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            score: variables.score
          },
          feedback: data.feedback
        });
        setShowCoachingModal(true);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/coaching-sessions', selectedEmployeeId] });
    },
    onError: (error: any) => {
      toast({
        title: "Coaching Failed",
        description: error.message || "Failed to generate coaching",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees = (employees as any[])?.filter((employee: any) =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getEmployeeName = (employeeId: string) => {
    const employee = (employees as any[])?.find((e: any) => e.id === employeeId);
    return employee?.name || employeeId;
  };

  const getSessionTypeColor = (type: string) => {
    return type === 'automated' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent';
  };

  const getEmployeePip = (employeeId: string) => {
    return (activePips as any[])?.find((pip: any) => pip.employeeId === employeeId);
  };

  const getEmployeeLatestScore = (employeeId: string) => {
    const empMetrics = (performanceMetrics as any[])?.filter((m: any) => m.employeeId === employeeId) || [];
    if (empMetrics.length === 0) return null;
    const latest = empMetrics.sort((a: any, b: any) => b.period - a.period)[0];
    return latest?.score || null;
  };

  const downloadCoachingReport = (session: any) => {
    try {
      const doc = new jsPDF();
      const employee = (employees as any[])?.find((e: any) => e.id === session.employeeId);
      
      // Set title
      doc.setFontSize(16);
      doc.text('COACHING SESSION REPORT', 20, 20);
      
      // Employee info
      doc.setFontSize(12);
      doc.text(`Employee: ${employee?.name || session.employeeId}`, 20, 40);
      doc.text(`Date: ${session.date}`, 20, 50);
      doc.text(`Type: ${session.type}`, 20, 60);
      if (session.score) {
        doc.text(`Performance Score: ${session.score}%`, 20, 70);
      }
      if (session.pipId) {
        doc.text(`PIP Session ID: ${session.pipId}`, 20, 80);
      }
      
      // Feedback content
      doc.setFontSize(11);
      doc.text('Coaching Feedback:', 20, 100);
      const lines = doc.splitTextToSize(session.feedback, 170);
      doc.text(lines, 20, 110);
      
      // Download the PDF
      const fileName = `Coaching_Report_${employee?.name.replace(/\s+/g, '_') || session.employeeId}_${session.date}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  const autoGenerateCoachingForPips = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const pip of (activePips as any[]) || []) {
        const latestScore = getEmployeeLatestScore(pip.employeeId);
        if (latestScore) {
          const response = await apiRequest("POST", "/api/generate-coaching", {
            employeeId: pip.employeeId,
            score: latestScore,
            pipId: pip.id
          });
          results.push(await response.json());
        }
      }
      return results;
    },
    onSuccess: (results) => {
      toast({
        title: "Bulk Coaching Generated",
        description: `Generated coaching sessions for ${results.length} PIP employees.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/coaching-sessions'] });
    },
    onError: () => {
      toast({
        title: "Bulk Coaching Failed",
        description: "Failed to generate coaching for PIP employees",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex-1 p-6 overflow-auto" data-testid="coaching-system-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Coaching System</h2>
            <p className="text-sm text-muted-foreground">
              Generate and manage coaching feedback for employees
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => autoGenerateCoachingForPips.mutate()}
              disabled={autoGenerateCoachingForPips.isPending || !activePips || activePips.length === 0}
              data-testid="button-bulk-coaching"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Generate for PIPs ({(activePips as any[])?.length || 0})
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Select Employee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="employee-search">Search Employees</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="employee-search"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-employee-search"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredEmployees.map((employee: any) => (
                <div
                  key={employee.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedEmployeeId === employee.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  data-testid={`employee-card-${employee.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">{employee.id}</p>
                      {getEmployeePip(employee.id) && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          On PIP
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={employee.status === 'pip' ? 'destructive' : 'secondary'} className="mb-1">
                        {employee.status}
                      </Badge>
                      {getEmployeeLatestScore(employee.id) && (
                        <p className="text-xs text-muted-foreground">
                          Score: {getEmployeeLatestScore(employee.id)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedEmployeeId && (
              <div className="pt-4 border-t">
                <GenerateCoachingForm 
                  employeeId={selectedEmployeeId}
                  onGenerate={(data) => generateCoachingMutation.mutate(data)}
                  isLoading={generateCoachingMutation.isPending}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coaching Sessions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Coaching Sessions
                {selectedEmployeeId && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    for {getEmployeeName(selectedEmployeeId)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedEmployeeId ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select an employee to view their coaching sessions
                  </p>
                </div>
              ) : sessionsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : !coachingSessions || coachingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No coaching sessions found for this employee
                  </p>
                  <Button 
                    onClick={() => generateCoachingMutation.mutate({
                      employeeId: selectedEmployeeId,
                      score: 70
                    })}
                    disabled={generateCoachingMutation.isPending}
                    data-testid="button-generate-first-coaching"
                  >
                    Generate First Coaching Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {coachingSessions.map((session: any) => (
                    <div 
                      key={session.id} 
                      className="border border-border rounded-lg p-4"
                      data-testid={`coaching-session-${session.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSessionTypeColor(session.type)}>
                            {session.type}
                          </Badge>
                          {session.score && (
                            <Badge variant="outline">
                              Score: {session.score}
                            </Badge>
                          )}
                          {session.pipId && (
                            <Badge variant="destructive" className="text-xs">
                              PIP Session
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadCoachingReport(session)}
                            className="h-7 px-2 text-xs"
                            data-testid={`button-download-coaching-${session.id}`}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            {session.date}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm leading-relaxed">{session.feedback}</p>
                      
                      {session.pipId && (
                        <div className="mt-2 p-2 bg-destructive/5 rounded border border-destructive/20">
                          <p className="text-xs text-destructive font-medium mb-1">
                            Performance Improvement Plan Context
                          </p>
                          <p className="text-xs text-muted-foreground">
                            This coaching session is part of an active PIP (ID: {session.pipId}). 
                            Focus areas include meeting improvement targets and following the structured development plan.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Coaching Feedback Modal */}
      {modalData && (
        <CoachingFeedbackModal
          isOpen={showCoachingModal}
          onClose={() => setShowCoachingModal(false)}
          employee={modalData.employee}
          feedback={modalData.feedback}
        />
      )}
    </div>
  );
}

function GenerateCoachingForm({ 
  employeeId, 
  onGenerate, 
  isLoading 
}: { 
  employeeId: string; 
  onGenerate: (data: any) => void;
  isLoading: boolean;
}) {
  const [score, setScore] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!score) return;
    
    onGenerate({ employeeId, score });
    setScore("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="performance-score">Performance Score</Label>
        <Input
          id="performance-score"
          type="number"
          min="0"
          max="100"
          placeholder="Enter score (0-100)"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          data-testid="input-performance-score"
        />
      </div>
      <Button 
        type="submit" 
        size="sm" 
        disabled={!score || isLoading}
        className="w-full"
        data-testid="button-generate-coaching"
      >
        <Send className="w-4 h-4 mr-2" />
        Generate Coaching
      </Button>
    </form>
  );
}
