import { DollarSign, Info, LogOut, Moon, Palette, Sun } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import { SUPPORTED_CURRENCIES, useCurrency } from "../context/CurrencyContext";

interface Props {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  onSignOut: () => void;
}

export default function Settings({ darkMode, setDarkMode, onSignOut }: Props) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div data-ocid="settings.page" className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your app preferences and account.
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Moon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Sun className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label
                  htmlFor="dark-mode-switch"
                  className="font-medium cursor-pointer"
                >
                  Dark Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  {darkMode
                    ? "Currently using dark theme"
                    : "Currently using light theme"}
                </p>
              </div>
            </div>
            <Switch
              id="dark-mode-switch"
              data-ocid="settings.darkmode.switch"
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Currency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Display Currency</p>
              <p className="text-xs text-muted-foreground">
                Choose the currency used across the app.
              </p>
            </div>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as typeof currency)}
            >
              <SelectTrigger
                data-ocid="settings.currency.select"
                className="w-52"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Sign Out</p>
              <p className="text-xs text-muted-foreground">
                Sign out from your Internet Identity session.
              </p>
            </div>
            <Button
              data-ocid="settings.signout.button"
              variant="destructive"
              size="sm"
              onClick={onSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4" /> About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">App Name</span>
            <span className="font-medium">FinanceFlow</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-medium">Internet Computer</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
