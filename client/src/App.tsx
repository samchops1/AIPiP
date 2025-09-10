import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import DataUpload from "@/pages/data-upload";
import PipManagement from "@/pages/pip-management";
import CoachingSystem from "@/pages/coaching-system";
import AuditLogs from "@/pages/audit-logs";
import Settings from "@/pages/settings";
import EmployeeDetails from "@/pages/employee-details";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function Router() {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/data-upload" component={DataUpload} />
          <Route path="/pips" component={PipManagement} />
          <Route path="/coaching" component={CoachingSystem} />
          <Route path="/audit" component={AuditLogs} />
          <Route path="/settings" component={Settings} />
          <Route path="/employee/:id" component={EmployeeDetails} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
