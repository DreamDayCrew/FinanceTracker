import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Wallet, Calendar, Check, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SalaryProfile {
  id: number;
  paydayRule: string;
  fixedDay: number | null;
  monthlyAmount: string | null;
  accountId: number | null;
}

interface Account {
  id: number;
  name: string;
  type: string;
  balance: string;
}

interface Payday {
  month: number;
  year: number;
  date: string;
}

interface SalaryCycle {
  id: number;
  month: number;
  year: number;
  expectedPayDate: string;
  actualPayDate: string | null;
  expectedAmount: string | null;
  actualAmount: string | null;
}

export default function Salary() {
  const [paydayRule, setPaydayRule] = useState("last_working_day");
  const [fixedDay, setFixedDay] = useState("25");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [showSalary, setShowSalary] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<SalaryProfile | null>({
    queryKey: ["/api/salary-profile"],
    queryFn: async () => {
      const res = await fetch("/api/salary-profile");
      return res.json();
    },
  });

  const { data: nextPaydays = [] } = useQuery<Payday[]>({
    queryKey: ["/api/salary-profile/next-paydays"],
    queryFn: async () => {
      const res = await fetch("/api/salary-profile/next-paydays");
      return res.json();
    },
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      const allAccounts = await res.json();
      return allAccounts.filter((acc: Account) => acc.type === 'bank');
    },
  });

  useEffect(() => {
    if (profile) {
      setPaydayRule(profile.paydayRule || "last_working_day");
      setFixedDay(profile.fixedDay?.toString() || "25");
      setMonthlyAmount(profile.monthlyAmount || "");
      setAccountId(profile.accountId?.toString() || "");
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        paydayRule,
        fixedDay: paydayRule === "fixed_day" ? parseInt(fixedDay) : null,
        monthlyAmount: monthlyAmount || null,
        accountId: accountId ? parseInt(accountId) : null,
      };

      if (profile) {
        const res = await fetch(`/api/salary-profile/${profile.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return res.json();
      } else {
        const res = await fetch("/api/salary-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary-profile/next-paydays"] });
      toast({ title: "Salary settings saved!" });
    },
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/more">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Salary & Income</h1>
      </div>

      <Card className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Wallet className="w-10 h-10" />
              <div>
                <p className="text-sm opacity-90">Monthly Salary</p>
                <p className="text-2xl font-bold">
                  {monthlyAmount ? (showSalary ? `₹${parseFloat(monthlyAmount).toLocaleString()}` : "₹ *********") : "Not set"}
                </p>
              </div>
            </div>
            {monthlyAmount && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-white/20"
                onClick={() => setShowSalary(!showSalary)}
              >
                {showSalary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payday Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Credit Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select account where salary is credited" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name} - {account.type === "bank" ? "Bank" : "Credit Card"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Monthly Amount (₹)</Label>
            <div className="relative">
              <Input 
                type={showSalary ? "number" : "password"}
                placeholder="50000"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                className="pr-10"
              />
              {monthlyAmount && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowSalary(!showSalary)}
                  type="button"
                >
                  {showSalary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>When do you get paid?</Label>
            <Select value={paydayRule} onValueChange={setPaydayRule}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_working_day">Last working day of month</SelectItem>
                <SelectItem value="fixed_day">Fixed day each month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paydayRule === "fixed_day" && (
            <div>
              <Label>Day of Month</Label>
              <Select value={fixedDay} onValueChange={setFixedDay}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button className="w-full" onClick={() => saveMutation.mutate()}>
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Paydays
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextPaydays.length === 0 ? (
            <p className="text-muted-foreground text-sm">Configure your settings to see payday predictions</p>
          ) : (
            <div className="space-y-2">
              {nextPaydays.map((payday, index) => {
                const date = new Date(payday.date);
                const isThisMonth = index === 0;
                return (
                  <div 
                    key={`${payday.month}-${payday.year}`}
                    className={`flex items-center justify-between p-3 rounded-lg ${isThisMonth ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                        <span className="text-sm font-medium">{monthNames[payday.month - 1]}</span>
                      </div>
                      <div>
                        <p className="font-medium">{format(date, "EEEE, d MMM yyyy")}</p>
                        <p className="text-sm text-muted-foreground">
                          {isThisMonth ? "This month" : `${monthNames[payday.month - 1]} ${payday.year}`}
                        </p>
                      </div>
                    </div>
                    {isThisMonth && (
                      <div className="text-primary font-medium text-sm">Next</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
