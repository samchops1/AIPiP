import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText
} from "lucide-react";

interface CsvUploaderProps {
  onUpload: (data: any[]) => void;
  isLoading?: boolean;
}

interface ParsedData {
  employee_id: string;
  period: number;
  score: number;
  tasks_completed: number;
  date: string;
}

export default function CsvUploader({ onUpload, isLoading }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const requiredColumns = ['employee_id', 'period', 'score', 'tasks_completed', 'date'];

  const validateRow = (row: any, rowIndex: number): string[] => {
    const rowErrors: string[] = [];

    // Check required columns
    requiredColumns.forEach(col => {
      if (!row.hasOwnProperty(col) || row[col] === undefined || row[col] === '') {
        rowErrors.push(`Row ${rowIndex + 1}: Missing ${col}`);
      }
    });

    // Validate data types and ranges
    if (row.period !== undefined && (isNaN(Number(row.period)) || Number(row.period) < 1)) {
      rowErrors.push(`Row ${rowIndex + 1}: Period must be a positive number`);
    }

    if (row.score !== undefined && (isNaN(Number(row.score)) || Number(row.score) < 0 || Number(row.score) > 100)) {
      rowErrors.push(`Row ${rowIndex + 1}: Score must be between 0 and 100`);
    }

    if (row.tasks_completed !== undefined && (isNaN(Number(row.tasks_completed)) || Number(row.tasks_completed) < 0)) {
      rowErrors.push(`Row ${rowIndex + 1}: Tasks completed must be a non-negative number`);
    }

    // Validate date format (YYYY-MM-DD)
    if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      rowErrors.push(`Row ${rowIndex + 1}: Date must be in YYYY-MM-DD format`);
    }

    return rowErrors;
  };

  const parseCsv = (text: string): { data: ParsedData[], errors: string[] } => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      return { data: [], errors: ['CSV must have at least a header row and one data row'] };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data: ParsedData[] = [];
    const errors: string[] = [];

    // Check if all required columns are present
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      return { data: [], errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Validate row
      const rowErrors = validateRow(row, i - 1);
      errors.push(...rowErrors);

      if (rowErrors.length === 0) {
        data.push({
          employee_id: row.employee_id,
          period: parseInt(row.period),
          score: parseFloat(row.score),
          tasks_completed: parseInt(row.tasks_completed),
          date: row.date
        });
      }
    }

    return { data, errors };
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { data, errors } = parseCsv(text);
      
      setPreview(data.slice(0, 5)); // Show first 5 rows as preview
      setErrors(errors);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleUpload = () => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { data, errors } = parseCsv(text);
      
      if (errors.length > 0) {
        toast({
          title: "Validation Failed",
          description: `Found ${errors.length} error(s). Please fix them before uploading.`,
          variant: "destructive",
        });
        return;
      }
      
      onUpload(data);
    };
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : file 
              ? 'border-accent bg-accent/5' 
              : 'border-border'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="csv-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
          data-testid="csv-file-input"
        />
        
        {file ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <File className="w-6 h-6 text-accent" />
              <span className="font-medium">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                data-testid="button-clear-file"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {file.size} bytes • {preview.length} valid rows
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium mb-1">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground mb-3">
                or click to browse files
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-browse-files"
              >
                Browse Files
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <h4 className="font-medium text-destructive">Validation Errors</h4>
            </div>
            <div className="space-y-1 text-sm">
              {errors.slice(0, 10).map((error, index) => (
                <p key={index} className="text-destructive">{error}</p>
              ))}
              {errors.length > 10 && (
                <p className="text-muted-foreground">... and {errors.length - 10} more errors</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      {preview.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="w-5 h-5 text-accent" />
              <h4 className="font-medium">Data Preview</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Employee ID</th>
                    <th className="text-left p-2">Period</th>
                    <th className="text-left p-2">Score</th>
                    <th className="text-left p-2">Tasks</th>
                    <th className="text-left p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{row.employee_id}</td>
                      <td className="p-2">{row.period}</td>
                      <td className="p-2">{row.score}</td>
                      <td className="p-2">{row.tasks_completed}</td>
                      <td className="p-2">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {file && (
              <p className="text-xs text-muted-foreground mt-2">
                Showing first 5 rows. Full file contains more data.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {file && (
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={isLoading || errors.length > 0}
            data-testid="button-upload-csv"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
