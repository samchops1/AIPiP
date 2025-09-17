import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Upload, 
  ClipboardList, 
  MessageSquare, 
  FileText, 
  Settings,
  Bot,
  Shield,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Data Upload", href: "/data-upload", icon: Upload },
  { name: "PIP Management", href: "/pips", icon: ClipboardList },
  { name: "Coaching System", href: "/coaching", icon: MessageSquare },
  { name: "Audit Logs", href: "/audit", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  
  const { data: systemSettings } = useQuery({
    queryKey: ['/api/system-settings'],
  });

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Trilogy AI HR Management System</h1>
            <p className="text-xs text-muted-foreground">AI Talent Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-secondary"
                  )}
                  data-testid={`nav-link-${item.href === "/" ? "dashboard" : item.href.slice(1)}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Emergency Controls */}
      <div className="p-3 border-t border-border">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-destructive">Emergency Controls</span>
            <div 
              className={cn(
                "w-2 h-2 rounded-full",
(systemSettings as any)?.killSwitchActive ? "bg-destructive" : "bg-accent"
              )}
              data-testid="system-status-indicator"
            />
          </div>
          <Link 
            href="/settings"
            className={cn(
              "w-full px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center",
(systemSettings as any)?.killSwitchActive
                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
            data-testid="emergency-controls-button"
          >
            <Shield className="w-4 h-4 mr-2" />
            {(systemSettings as any)?.killSwitchActive ? "System Paused" : "Kill Switch"}
          </Link>
        </div>
      </div>
    </aside>
  );
}
