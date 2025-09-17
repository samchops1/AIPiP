import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Header() {
  const { toast } = useToast();
  const { data: systemSettings } = useQuery({
    queryKey: ['/api/system-settings'],
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['/api/audit-logs'],
  });

  // Count recent notifications (logs from today)
  const today = new Date().toISOString().split('T')[0];

  // Demo role state (used for filtering + header control)
  const [demoRole, setDemoRole] = useState<string>(() => {
    if (typeof window === 'undefined') return 'hr';
    const saved = window.localStorage.getItem('demoRole');
    const role = saved || 'hr';
    // Ensure localStorage is set synchronously so other pages can read it on first render
    if (!saved) window.localStorage.setItem('demoRole', role);
    return role;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Broadcast current role on mount so listeners render correct state
    window.dispatchEvent(new CustomEvent('demoRoleChanged', { detail: demoRole }));
  }, []);

  // Use stateful demoRole for filtering; seed localStorage if missing
  const managerActions = new Set([
    'pip_created', 'pip_updated', 'pip_created_automatically', 'coaching_generated', 'coaching_session_created', 'csv_uploaded', 'template_generated'
  ]);
  const hrActions = new Set([
    'employee_auto_terminated', 'employee_terminated_automatically', 'termination', 'system_settings_updated', 'cicd_simulation_run', 'triage_agents_run'
  ]);
  const viewerActions = new Set(['system_settings_updated']);

  const roleFilter = (log: any) => {
    const action = String(log.action || '').toLowerCase();
    if (demoRole === 'manager') return managerActions.has(action);
    if (demoRole === 'hr') return hrActions.has(action) || managerActions.has(action);
    return viewerActions.has(action);
  };

  const todayLogs = (auditLogs as any[])?.filter((log: any) => {
    const isToday = log.timestamp && log.timestamp.toString().startsWith(today);
    return isToday && roleFilter({ action: (log.action || '').toLowerCase() });
  }) || [];

  const onRoleChange = (role: string) => {
    setDemoRole(role);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('demoRole', role);
      // Notify other components in-app
      window.dispatchEvent(new CustomEvent('demoRoleChanged', { detail: role }));
    }
    toast({ title: 'Role updated', description: `Demo role set to ${role}` });
  };

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
          {/* Demo Role Switcher */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Role</span>
            <Select defaultValue={demoRole} onValueChange={onRoleChange}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">viewer</SelectItem>
                <SelectItem value="manager">manager</SelectItem>
                <SelectItem value="hr">hr</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative"
                data-testid="button-notifications"
                aria-label="Notifications"
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
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {todayLogs.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">No notifications today</div>
              ) : (
                (todayLogs as any[]).slice(0, 10).map((log: any, i: number) => (
                  <DropdownMenuItem key={`${log.id || log.entityId || 'log'}-${i}`} className="flex flex-col items-start space-y-0.5 py-2">
                    <div className="text-sm font-medium">{log.action}</div>
                    <div className="text-xs text-muted-foreground">{log.entityType} • {new Date(log.timestamp).toLocaleTimeString()}</div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Current Role Badge */}
          <Badge variant="secondary" className="uppercase">{demoRole}</Badge>
        </div>
      </div>
    </header>
  );
}
