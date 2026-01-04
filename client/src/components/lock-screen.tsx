import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Delete } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const verifyPin = async (enteredPin: string) => {
    setIsVerifying(true);
    try {
      const response = await apiRequest("POST", "/api/user/verify-pin", { pin: enteredPin });
      const result = await response.json();
      
      if (result.valid) {
        onUnlock();
      } else {
        setError(true);
        setPin("");
        toast({ title: "Incorrect PIN", variant: "destructive" });
      }
    } catch {
      setError(true);
      setPin("");
      toast({ title: "Failed to verify PIN", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Enter PIN</h1>
          <p className="text-sm text-muted-foreground text-center">
            Enter your 4-digit PIN to unlock
          </p>
        </div>

        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                pin.length > i
                  ? error
                    ? "bg-destructive border-destructive"
                    : "bg-primary border-primary"
                  : error
                  ? "border-destructive"
                  : "border-muted-foreground"
              }`}
              data-testid={`pin-dot-${i}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full">
          {digits.map((digit, index) => {
            if (digit === "") {
              return <div key={index} />;
            }
            if (digit === "delete") {
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="lg"
                  className="h-16 text-xl"
                  onClick={handleDelete}
                  disabled={isVerifying || pin.length === 0}
                  data-testid="button-pin-delete"
                >
                  <Delete className="w-6 h-6" />
                </Button>
              );
            }
            return (
              <Button
                key={index}
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={() => handleDigit(digit)}
                disabled={isVerifying}
                data-testid={`button-pin-${digit}`}
              >
                {digit}
              </Button>
            );
          })}
        </div>

        {isVerifying && (
          <p className="text-sm text-muted-foreground animate-pulse">Verifying...</p>
        )}
      </div>
    </div>
  );
}
