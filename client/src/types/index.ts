// Employee related types
export interface EmployeeWithMetrics {
  id: string;
  name: string;
  email?: string;
  department?: string;
  role?: string;
  status: 'active' | 'pip' | 'terminated';
  latestScore: number;
  averageScore: number;
  trend: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  consecutiveLowPeriods: number;
}

// PIP related types
export interface PipWithDetails {
  id: string;
  employeeId: string;
  employeeName?: string;
  status: 'active' | 'completed' | 'terminated';
  startDate: string;
  endDate: string;
  gracePeriodDays: number;
  goals: string[];
  coachingPlan: string;
  progress: number;
  initialScore?: number;
  currentScore?: number;
  improvementRequired: number;
  daysRemaining: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Dashboard metrics
export interface DashboardMetrics {
  totalEmployees: number;
  activePIPs: number;
  improvementRate: number;
  autoActionsToday: number;
  systemStatus: 'active' | 'paused';
  lastUpdated: string;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  details: Record<string, any>;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// CSV upload types
export interface CsvRow {
  employee_id: string;
  period: number;
  score: number;
  tasks_completed: number;
  date: string;
}

export interface CsvValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CsvUploadResult {
  metricsCreated: number;
  pipEvaluationResults: {
    processed: number;
    results: Array<{
      action: string;
      employeeId: string;
      pipId?: string;
      reason: string;
    }>;
  };
  errors: CsvValidationError[];
}

// Coaching session types
export interface CoachingSessionWithEmployee {
  id: string;
  employeeId: string;
  employeeName?: string;
  pipId?: string;
  feedback: string;
  type: 'automated' | 'manual';
  score?: number;
  date: string;
  category: 'skill_development' | 'performance' | 'behavior' | 'goal_setting' | 'motivation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionItems: string[];
  followUpRequired: boolean;
}

// System settings
export interface SystemSettingsForm {
  killSwitchActive: boolean;
  minScoreThreshold: number;
  consecutiveLowPeriods: number;
  defaultGracePeriod: number;
  minImprovementPercent: number;
}

// Performance analytics
export interface PerformanceTrend {
  period: number;
  score: number;
  date: string;
  trend: 'improving' | 'declining' | 'stable';
  changePercent: number;
}

export interface EmployeeAnalytics {
  employeeId: string;
  currentScore: number;
  averageScore: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  lastEvaluationDate: string;
  nextEvaluationDate: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form validation types
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// Notification types
export interface NotificationData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

// Filter and sort types
export interface FilterOptions {
  status?: string[];
  riskLevel?: string[];
  department?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  scoreRange?: {
    min: number;
    max: number;
  };
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Export types for reports
export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeFields: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: FilterOptions;
}

// Integration types
export interface HRSystemIntegration {
  id: string;
  name: string;
  type: 'hrms' | 'payroll' | 'ats' | 'lms';
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  nextSync: string;
  configuration: Record<string, any>;
}

// Workflow types
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'evaluation' | 'notification' | 'coaching' | 'review' | 'termination';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  executedAt?: string;
  result?: any;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  employeeId: string;
  workflowType: 'pip_evaluation' | 'coaching_generation' | 'termination_review';
  status: 'running' | 'completed' | 'failed' | 'paused';
  steps: WorkflowStep[];
  startedAt: string;
  completedAt?: string;
  triggeredBy: 'system' | 'user' | 'schedule';
}
