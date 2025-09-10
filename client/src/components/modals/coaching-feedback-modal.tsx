import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { User, MessageSquare, TrendingUp, CheckCircle } from "lucide-react";

interface CoachingFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    name: string;
    role: string;
    score: number;
  };
  feedback: string;
}

export default function CoachingFeedbackModal({ 
  isOpen, 
  onClose, 
  employee, 
  feedback 
}: CoachingFeedbackModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [progress, setProgress] = useState(0);

  const steps = [
    "Analyzing performance data...",
    "Generating personalized coaching...", 
    "Delivering feedback to employee...",
    "Coaching session complete!"
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setShowFeedback(false);
      setProgress(0);
      
      const timer = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < steps.length - 1) {
            setProgress((prev + 1) * 25);
            if (prev === steps.length - 2) {
              setTimeout(() => setShowFeedback(true), 500);
            }
            return prev + 1;
          }
          clearInterval(timer);
          return prev;
        });
      }, 1500);

      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-accent/10 text-accent">Performing Well</Badge>;
    if (score >= 70) return <Badge className="bg-chart-3/10 text-chart-3">At Risk</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  const getCoachingIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="w-5 h-5 text-accent" />;
    if (score >= 70) return <MessageSquare className="w-5 h-5 text-chart-3" />;
    return <MessageSquare className="w-5 h-5 text-destructive" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Automated Coaching System</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{employee.name}</h3>
              <p className="text-sm text-muted-foreground">{employee.role}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{employee.score}%</div>
              {getScoreBadge(employee.score)}
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Processing Status</span>
              <span className="text-sm text-muted-foreground">{progress}% complete</span>
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
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Section */}
          {showFeedback && (
            <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  {getCoachingIcon(employee.score)}
                  <h4 className="font-semibold">Coaching Feedback Generated</h4>
                </div>
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">{feedback}</p>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                💡 This feedback has been automatically generated based on the employee's performance score of {employee.score}% and will be added to their coaching history for future reference.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            {currentStep === steps.length - 1 && (
              <Button onClick={onClose} data-testid="button-close-coaching">
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}