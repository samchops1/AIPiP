import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { User, AlertTriangle, FileText, CheckCircle, XCircle, Download } from "lucide-react";
// @ts-ignore
import jsPDF from 'jspdf';

interface AutoFiringModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Array<{
    id: string;
    name: string;
    role: string;
    finalScore: number;
    finalUtilization: number;
    reason: string;
    terminationLetter?: string;
  }>;
}

export default function AutoFiringModal({ 
  isOpen, 
  onClose, 
  employees 
}: AutoFiringModalProps) {
  
  const downloadTerminationLetter = (employee: any) => {
    if (!employee.terminationLetter) return;
    
    try {
      const doc = new jsPDF();
      const content = employee.terminationLetter;
      
      // Set title
      doc.setFontSize(16);
      doc.text('TERMINATION LETTER', 20, 20);
      
      // Set content
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(content, 170);
      doc.text(lines, 20, 40);
      
      // Download the PDF
      const fileName = `Termination_Letter_${employee.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF generation failed, falling back to text:', error);
      // Fallback to text file
      const content = employee.terminationLetter;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Termination_Letter_${employee.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };
  const [currentStep, setCurrentStep] = useState(0);
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const steps = [
    "Scanning employee performance history...",
    "Evaluating termination criteria...",
    "Processing terminations...",
    "Auto-firing process complete!"
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setCurrentEmployeeIndex(0);
      setProgress(0);
      setShowResults(false);
      
      let stepIndex = 0;
      const timer = setInterval(() => {
        stepIndex++;
        setCurrentStep(stepIndex);
        setProgress((stepIndex / steps.length) * 100);
        
        // Show employee processing animation during step 1 (evaluating)
        if (stepIndex === 1 && employees.length > 0) {
          setTimeout(() => {
            setCurrentEmployeeIndex(prevIndex => 
              prevIndex < employees.length - 1 ? prevIndex + 1 : prevIndex
            );
          }, 400);
        }
        
        // Show results when we complete all steps
        if (stepIndex >= steps.length) {
          clearInterval(timer);
          setProgress(100);
          setShowResults(true);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, employees.length]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>Automated Termination System</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Automated termination process in progress
              </span>
            </div>
            <p className="text-xs text-destructive/80 mt-1">
              Evaluating employees based on consecutive poor performance and low utilization
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Status</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    index <= currentStep 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm ${
                    index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step}
                  </span>
                  {index === currentStep && currentStep < steps.length - 1 && (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Employee Processing Animation */}
          {(currentStep === 1 || currentStep === 2) && employees.length > 0 && (
            <div className="space-y-3 animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
              <h4 className="text-sm font-medium">Processing Employees:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {employees.map((employee, index) => (
                  <div 
                    key={employee.id} 
                    className={`flex items-center justify-between p-3 rounded border transition-all duration-500 ${
                      index <= currentEmployeeIndex 
                        ? 'bg-destructive/10 border-destructive/30' 
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">{employee.role}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div>Score: {employee.finalScore}%</div>
                      <div>Util: {employee.finalUtilization}%</div>
                    </div>
                    {index <= currentEmployeeIndex && (
                      <XCircle className="w-4 h-4 text-destructive animate-in fade-in-50 scale-in-95 duration-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Section */}
          {showResults && (
            <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <FileText className="w-5 h-5 text-destructive" />
                  <h4 className="font-semibold">Termination Results</h4>
                </div>
                
                {employees.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                      <div className="text-sm font-medium text-destructive mb-2">
                        ⚠️ {employees.length} employee(s) terminated due to poor performance
                      </div>
                      <div className="space-y-3">
                        {employees.map((employee) => (
                          <div key={employee.id} className="border border-destructive/20 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-medium">{employee.name}</div>
                                <div className="text-xs text-muted-foreground">{employee.role}</div>
                                <div className="text-xs text-muted-foreground">
                                  Final Score: {employee.finalScore}% | Utilization: {employee.finalUtilization}%
                                </div>
                              </div>
                              <Badge variant="destructive">TERMINATED</Badge>
                            </div>
                            
                            {employee.terminationLetter && (
                              <div className="mt-3 bg-muted/50 rounded p-3 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Termination Letter</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadTerminationLetter(employee)}
                                    className="h-7 px-2 text-xs"
                                    data-testid={`button-download-letter-${employee.id}`}
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Download
                                  </Button>
                                </div>
                                <div className="text-xs bg-white/50 rounded border p-2 max-h-32 overflow-y-auto">
                                  <pre className="whitespace-pre-wrap text-xs">{employee.terminationLetter}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground bg-accent/10 border border-accent/20 p-3 rounded">
                      📄 Termination letters have been automatically generated with current date, performance data and specific reasons. Click "Download" to save individual letters as PDF files. All actions have been logged for audit compliance.
                    </div>
                  </div>
                ) : (
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-accent mx-auto mb-2" />
                    <div className="text-sm font-medium text-accent">No terminations required</div>
                    <div className="text-xs text-muted-foreground">All employees meet minimum performance standards</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            {currentStep === steps.length - 1 && (
              <Button onClick={onClose} data-testid="button-close-auto-firing">
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}