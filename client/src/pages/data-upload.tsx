import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CsvUploader from "@/components/upload/csv-uploader";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";

export default function DataUpload() {
  const [uploadResults, setUploadResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDownloadSample = async () => {
    const response = await fetch("/api/sample-csv");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/upload-csv", data);
      return response.json();
    },
    onSuccess: (data) => {
      setUploadResults(data);
      toast({
        title: "Upload Successful",
        description: `${data.metricsCreated} performance metrics uploaded and processed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/performance-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-metrics'] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload CSV data",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex-1 p-6 overflow-auto" data-testid="data-upload-page">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Data Upload</h2>
        <p className="text-sm text-muted-foreground">
          Upload employee performance data for automated PIP evaluation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              CSV File Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CsvUploader
              onUpload={(data) => uploadMutation.mutate({ data })}
              isLoading={uploadMutation.isPending}
            />

            <Button
              variant="outline"
              onClick={handleDownloadSample}
              className="mt-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Sample CSV
            </Button>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Required CSV Format:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>employee_id:</strong> Unique employee identifier (e.g., E001)</p>
                <p><strong>period:</strong> Evaluation period number</p>
                <p><strong>score:</strong> Performance score (0-100)</p>
                <p><strong>tasks_completed:</strong> Number of tasks completed</p>
                <p><strong>date:</strong> Date in YYYY-MM-DD format</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Upload Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Prepare your CSV file</p>
                  <p className="text-xs text-muted-foreground">
                    Ensure all required columns are present and data is clean
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Upload and validate</p>
                  <p className="text-xs text-muted-foreground">
                    The system will validate data format and check for errors
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Automatic PIP evaluation</p>
                  <p className="text-xs text-muted-foreground">
                    System automatically evaluates employees for PIP eligibility
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {uploadResults && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-accent" />
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-accent/10 rounded-lg">
                <div className="text-2xl font-bold text-accent">
                  {uploadResults.metricsCreated}
                </div>
                <div className="text-sm text-muted-foreground">
                  Metrics Created
                </div>
              </div>
              
              <div className="text-center p-4 bg-chart-3/10 rounded-lg">
                <div className="text-2xl font-bold text-chart-3">
                  {uploadResults.pipEvaluationResults?.results?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  PIPs Generated
                </div>
              </div>
              
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {uploadResults.pipEvaluationResults?.processed || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Employees Processed
                </div>
              </div>
            </div>
            
            {uploadResults.pipEvaluationResults?.results?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">New PIPs Created:</h4>
                <div className="space-y-2">
                  {uploadResults.pipEvaluationResults.results.map((result: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-chart-3" />
                      <span>Employee {result.employeeId} - {result.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
