import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Filter, 
  Search, 
  Calendar,
  User,
  Download
} from "lucide-react";

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['/api/audit-logs'],
  });

  const filteredLogs = auditLogs?.filter((log: any) => {
    const matchesSearch = !searchTerm || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userId && log.userId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = filterAction === "all" || log.action.includes(filterAction);
    const matchesEntity = filterEntity === "all" || log.entityType === filterEntity;
    
    return matchesSearch && matchesAction && matchesEntity;
  }) || [];

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-accent/10 text-accent';
    if (action.includes('updated')) return 'bg-primary/10 text-primary';
    if (action.includes('terminated') || action.includes('fired')) return 'bg-destructive/10 text-destructive';
    if (action.includes('pip')) return 'bg-chart-3/10 text-chart-3';
    return 'bg-muted text-muted-foreground';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User ID', 'Details'].join(','),
      ...filteredLogs.map((log: any) => [
        formatTimestamp(log.timestamp),
        log.action,
        log.entityType,
        log.entityId,
        log.userId || '',
        JSON.stringify(log.details).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto" data-testid="audit-logs-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Audit Logs</h2>
            <p className="text-sm text-muted-foreground">
              Complete audit trail of all system actions and decisions
            </p>
          </div>
          <Button onClick={exportLogs} data-testid="button-export-logs">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-logs"
                />
              </div>
            </div>
            
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger data-testid="select-action-filter">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="pip">PIP Related</SelectItem>
                <SelectItem value="terminated">Termination</SelectItem>
                <SelectItem value="coaching">Coaching</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger data-testid="select-entity-filter">
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="pip">PIP</SelectItem>
                <SelectItem value="coaching_session">Coaching Session</SelectItem>
                <SelectItem value="performance_metric">Performance Metric</SelectItem>
                <SelectItem value="system_settings">System Settings</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Audit Logs Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterAction !== "all" || filterEntity !== "all" 
                  ? "Try adjusting your filters to see more results."
                  : "No audit logs have been generated yet."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map((log: any, index: number) => (
                <div 
                  key={log.id || index} 
                  className="p-6 hover:bg-muted/50 transition-colors"
                  data-testid={`audit-log-${log.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge className={getActionColor(log.action)}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {log.entityType}: {log.entityId}
                        </span>
                        {log.userId && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <User className="w-3 h-3 mr-1" />
                            {log.userId}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-3">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </div>
                      
                      {log.details && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-primary hover:text-primary/80">
                            View Details
                          </summary>
                          <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
