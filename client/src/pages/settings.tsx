import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings as SettingsIcon, 
  AlertTriangle, 
  Save,
  RotateCcw,
  Shield
} from "lucide-react";
import ConfirmationModal from "@/components/modals/confirmation-modal";

export default function Settings() {
  const [showKillSwitchModal, setShowKillSwitchModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/system-settings'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PUT", "/api/system-settings", updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "System settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const toggleKillSwitch = () => {
    if (settings?.killSwitchActive) {
      // Deactivating kill switch - no confirmation needed
      updateSettingsMutation.mutate({ killSwitchActive: false });
    } else {
      // Activating kill switch - show confirmation
      setShowKillSwitchModal(true);
    }
  };

  const confirmKillSwitch = () => {
    updateSettingsMutation.mutate({ killSwitchActive: true });
    setShowKillSwitchModal(false);
  };

  const handleSettingChange = (field: string, value: any) => {
    updateSettingsMutation.mutate({ [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto" data-testid="settings-page">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">System Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure AI-driven talent management system parameters
        </p>
      </div>

      <div className="space-y-6">
        {/* Emergency Controls */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Emergency Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Kill Switch</span>
                  <div className={`w-2 h-2 rounded-full ${
                    settings?.killSwitchActive ? 'bg-destructive' : 'bg-accent'
                  }`} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings?.killSwitchActive 
                    ? "All automated workflows are paused" 
                    : "System is active and processing automated workflows"
                  }
                </p>
              </div>
              <Button
                variant={settings?.killSwitchActive ? "outline" : "destructive"}
                onClick={toggleKillSwitch}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-kill-switch"
              >
                <Shield className="w-4 h-4 mr-2" />
                {settings?.killSwitchActive ? "Reactivate System" : "Emergency Stop"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PIP Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2" />
              PIP Evaluation Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="min-score-threshold">Minimum Score Threshold</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="min-score-threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={settings?.minScoreThreshold || 70}
                    onChange={(e) => handleSettingChange('minScoreThreshold', parseFloat(e.target.value))}
                    disabled={updateSettingsMutation.isPending}
                    data-testid="input-min-score-threshold"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Scores below this threshold trigger PIP evaluation
                </p>
              </div>

              <div>
                <Label htmlFor="consecutive-periods">Consecutive Low Periods</Label>
                <Input
                  id="consecutive-periods"
                  type="number"
                  min="1"
                  max="10"
                  value={settings?.consecutiveLowPeriods || 3}
                  onChange={(e) => handleSettingChange('consecutiveLowPeriods', parseInt(e.target.value))}
                  disabled={updateSettingsMutation.isPending}
                  className="mt-1"
                  data-testid="input-consecutive-periods"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of consecutive periods below threshold to trigger PIP
                </p>
              </div>

              <div>
                <Label htmlFor="grace-period">Default Grace Period</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="grace-period"
                    type="number"
                    min="7"
                    max="90"
                    value={settings?.defaultGracePeriod || 21}
                    onChange={(e) => handleSettingChange('defaultGracePeriod', parseInt(e.target.value))}
                    disabled={updateSettingsMutation.isPending}
                    data-testid="input-grace-period"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Number of days employees have to improve during PIP
                </p>
              </div>

              <div>
                <Label htmlFor="min-improvement">Minimum Improvement</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="min-improvement"
                    type="number"
                    min="5"
                    max="50"
                    value={settings?.minImprovementPercent || 10}
                    onChange={(e) => handleSettingChange('minImprovementPercent', parseFloat(e.target.value))}
                    disabled={updateSettingsMutation.isPending}
                    data-testid="input-min-improvement"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum performance improvement required to pass PIP
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                variant="outline"
                onClick={() => {
                  // Reset to defaults
                  updateSettingsMutation.mutate({
                    minScoreThreshold: 70,
                    consecutiveLowPeriods: 3,
                    defaultGracePeriod: 21,
                    minImprovementPercent: 10
                  });
                }}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-reset-defaults"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <p className="font-medium">
                  {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">System Status:</span>
                <p className={`font-medium ${settings?.killSwitchActive ? 'text-destructive' : 'text-accent'}`}>
                  {settings?.killSwitchActive ? 'Emergency Mode' : 'Active'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={showKillSwitchModal}
        onClose={() => setShowKillSwitchModal(false)}
        onConfirm={confirmKillSwitch}
        title="Activate Emergency Kill Switch"
        description="This will immediately pause all automated workflows including PIP evaluations, coaching generation, and termination processes. This action should only be used in emergency situations."
        confirmText="Activate Kill Switch"
        confirmVariant="destructive"
      />
    </div>
  );
}
