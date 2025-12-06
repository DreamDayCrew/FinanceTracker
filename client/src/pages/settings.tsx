import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Download, 
  Lock, 
  Fingerprint,
  KeyRound,
  AlertTriangle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });
  
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await apiRequest("PATCH", "/api/user", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const setPinMutation = useMutation({
    mutationFn: async (newPin: string) => {
      const response = await apiRequest("POST", "/api/user/set-pin", { pin: newPin });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsPinDialogOpen(false);
      setPin("");
      setConfirmPin("");
      toast({ title: "PIN set successfully" });
    },
    onError: () => {
      toast({ title: "Failed to set PIN", variant: "destructive" });
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/reset-pin");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "PIN removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove PIN", variant: "destructive" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (format: "csv" | "json") => {
      const response = await apiRequest("POST", "/api/export", { format });
      return response.json();
    },
    onSuccess: (data: { content: string; filename: string; format: string }) => {
      const blob = new Blob([data.content], { 
        type: data.format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: `Exported to ${data.format.toUpperCase()}` });
    },
    onError: () => {
      toast({ title: "Export failed", variant: "destructive" });
    },
  });

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
    updateUserMutation.mutate({ theme: newTheme });
  };

  const handleSetPin = () => {
    if (pin.length !== 4) {
      toast({ title: "PIN must be 4 digits", variant: "destructive" });
      return;
    }
    if (pin !== confirmPin) {
      toast({ title: "PINs don't match", variant: "destructive" });
      return;
    }
    setPinMutation.mutate(pin);
  };

  const hasPinSet = !!user?.pinHash;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b">
        <Button size="icon" variant="ghost" onClick={() => setLocation("/more")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Appearance */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Security
          </h2>
          
          <Card className="space-y-0 divide-y">
            {/* PIN Lock */}
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-5 h-5" />
                  <div>
                    <p className="font-medium">PIN Lock</p>
                    <p className="text-xs text-muted-foreground">
                      {hasPinSet ? "PIN is set" : "Protect app with 4-digit PIN"}
                    </p>
                  </div>
                </div>
                {hasPinSet ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => resetPinMutation.mutate()}
                    disabled={resetPinMutation.isPending}
                    data-testid="button-remove-pin"
                  >
                    Remove
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsPinDialogOpen(true)}
                    data-testid="button-set-pin"
                  >
                    Set PIN
                  </Button>
                )}
              </div>
            </CardContent>

            {/* Biometric */}
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Biometric Login</p>
                    <p className="text-xs text-muted-foreground">Use fingerprint to unlock</p>
                  </div>
                </div>
                <Switch
                  checked={user?.biometricEnabled || false}
                  onCheckedChange={(checked) => updateUserMutation.mutate({ biometricEnabled: checked })}
                  data-testid="switch-biometric"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Data */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </h2>
          <Card>
            <CardContent className="py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Download your transaction data for backup or analysis</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => exportMutation.mutate("csv")}
                  disabled={exportMutation.isPending}
                  data-testid="button-export-csv"
                >
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => exportMutation.mutate("json")}
                  disabled={exportMutation.isPending}
                  data-testid="button-export-json"
                >
                  Export JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </h2>
          <Card className="border-destructive/50">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Clearing data will remove all transactions, accounts, and budgets. This cannot be undone.
              </p>
              <Button variant="destructive" className="w-full" data-testid="button-clear-data">
                Clear All Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PIN Dialog */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set PIN</DialogTitle>
            <DialogDescription>Enter a 4-digit PIN to protect your app</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Enter PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
                data-testid="input-pin"
              />
            </div>
            <div>
              <Label>Confirm PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
                data-testid="input-confirm-pin"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleSetPin}
              disabled={setPinMutation.isPending}
              data-testid="button-confirm-pin"
            >
              {setPinMutation.isPending ? "Setting..." : "Set PIN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
