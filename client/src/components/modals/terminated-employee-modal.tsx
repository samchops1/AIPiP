import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Calendar, User, AlertTriangle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TerminatedEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    employeeId: string;
    employeeName: string;
    terminationDate: string;
    terminationReason: string;
    terminationLetter: string;
    finalScore: number;
    finalUtilization: number;
  } | null;
}

export default function TerminatedEmployeeModal({
  isOpen,
  onClose,
  employee
}: TerminatedEmployeeModalProps) {
  const { toast } = useToast();

  if (!employee) return null;

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/employees/${employee.employeeId}/termination-pdf`);
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${employee.employeeName.replace(/\s+/g, '_')}_Termination_Letter.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Downloaded",
        description: "Termination letter PDF has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download termination letter PDF.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-red-500" />
            <span>Termination Details - {employee.employeeName}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 space-y-6 overflow-hidden">
          {/* Summary Card */}
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Termination Date</div>
                  <div className="font-medium">{formatDate(employee.terminationDate)}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Final Performance</div>
                  <div className="font-medium">{employee.finalScore}% Score | {employee.finalUtilization}% Utilization</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-red-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Employee ID</div>
                  <div className="font-medium">{employee.employeeId}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
              <div className="text-xs text-muted-foreground mb-1">Termination Reason</div>
              <Badge variant="destructive" className="text-xs">
                {employee.terminationReason}
              </Badge>
            </div>
          </div>

          {/* Termination Letter */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Official Termination Letter</span>
              </h3>
              <Button 
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2"
                size="sm"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </Button>
            </div>
            
            <ScrollArea className="h-96 w-full border rounded-lg bg-muted/30">
              <div className="p-6">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {employee.terminationLetter}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}