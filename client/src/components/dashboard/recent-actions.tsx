import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageSquare, CheckCircle, Clock } from "lucide-react";

interface RecentActionsProps {
  auditLogs?: any[];
}

export default function RecentActions({ auditLogs }: RecentActionsProps) {
  const recentActions = auditLogs
    ?.filter(log => log.action !== 'csv_uploaded')
    ?.slice(0, 5) || [];

  const getActionIcon = (action: string) => {
    if (action.includes('pip')) return AlertTriangle;
    if (action.includes('coaching')) return MessageSquare;
    if (action.includes('completed')) return CheckCircle;
    return Clock;
  };

  const getActionColor = (action: string) => {
    if (action.includes('pip')) return 'text-destructive';
    if (action.includes('coaching')) return 'text-accent';
    if (action.includes('completed')) return 'text-chart-2';
    return 'text-muted-foreground';
  };

  const getActionTitle = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'pip_created': 'PIP Initiated',
      'pip_created_automatically': 'PIP Auto-Created',
      'coaching_session_created': 'Coaching Sent',
      'coaching_generated': 'Coaching Generated',
      'employee_created': 'Employee Added',
      'performance_metric_created': 'Metric Recorded',
      'system_settings_updated': 'Settings Updated'
    };
    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getActionDescription = (log: any) => {
    const { action, entityId, details } = log;
    
    if (action === 'pip_created' || action === 'pip_created_automatically') {
      return `${entityId} - Performance below threshold`;
    }
    if (action.includes('coaching')) {
      return `${entityId} - Feedback provided`;
    }
    if (action === 'employee_created') {
      return `New employee: ${details?.employee?.name || entityId}`;
    }
    return `Entity: ${entityId}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent AI Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {recentActions.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent actions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActions.map((log: any, index: number) => {
              const Icon = getActionIcon(log.action);
              
              return (
                <div 
                  key={log.id || index} 
                  className="flex items-start space-x-3"
                  data-testid={`recent-action-${index}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    log.action.includes('pip') ? 'bg-destructive/10' :
                    log.action.includes('coaching') ? 'bg-accent/10' :
                    'bg-primary/10'
                  }`}>
                    <Icon className={`w-4 h-4 ${getActionColor(log.action)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {getActionTitle(log.action)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getActionDescription(log)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(log.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
