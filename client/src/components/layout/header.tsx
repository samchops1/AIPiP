import { useQuery } from "@tanstack/react-query";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  const { data: systemSettings } = useQuery({
    queryKey: ['/api/system-settings'],
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['/api/audit-logs'],
  });

  // Count recent notifications (logs from today)
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = (auditLogs as any[])?.filter((log: any) => 
    log.timestamp && log.timestamp.toString().startsWith(today)
  ) || [];

  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Performance Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            AI-driven talent management overview
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* System Status */}
          <div className="flex items-center space-x-2" data-testid="system-status">
            <div className={`w-2 h-2 rounded-full ${
(systemSettings as any)?.killSwitchActive ? 'bg-destructive' : 'bg-accent'
            }`} />
            <span className="text-sm text-muted-foreground">
              {(systemSettings as any)?.killSwitchActive ? 'System Paused' : 'System Active'}
            </span>
          </div>
          
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative"
            data-testid="button-notifications"
          >
            <Bell className="w-4 h-4" />
            {todayLogs.length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center"
                data-testid="notification-badge"
              >
                {Math.min(todayLogs.length, 9)}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium" data-testid="user-name">Sarah Chen</p>
              <p className="text-xs text-muted-foreground" data-testid="user-role">HR Operations Lead</p>
            </div>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">SC</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
