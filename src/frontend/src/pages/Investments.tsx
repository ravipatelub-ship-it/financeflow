import { Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  Investment,
  PortfolioSummary,
  backendInterface,
} from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useCurrency } from "../context/CurrencyContext";
import { formatCurrencyWithCode, formatDate } from "../lib/format";

interface Props {
  actor: backendInterface;
}
const emptyForm = {
  name: "",
  investmentType: "stock",
  amountInvested: "",
  currentValue: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function Investments({ actor }: Props) {
  const { currency } = useCurrency();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalProfitLoss: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [invs, pf] = await Promise.all([
      actor.getAllInvestments(),
      actor.getPortfolioSummary(),
    ]);
    setInvestments(invs);
    setPortfolio(pf);
    setLoading(false);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: load is recreated each render
  useEffect(() => {
    load();
  }, [actor]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };
  const openEdit = (inv: Investment) => {
    setForm({
      name: inv.name,
      investmentType: inv.investmentType,
      amountInvested: String(inv.amountInvested),
      currentValue: String(inv.currentValue),
      date: new Date(Number(inv.date)).toISOString().slice(0, 10),
      notes: inv.notes,
    });
    setEditingId(inv.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dateTs = BigInt(new Date(form.date).getTime());
      if (editingId !== null) {
        await actor.updateInvestment(
          editingId,
          form.name,
          form.investmentType,
          Number.parseFloat(form.amountInvested),
          Number.parseFloat(form.currentValue),
          dateTs,
          form.notes,
        );
      } else {
        await actor.createInvestment(
          form.name,
          form.investmentType,
          Number.parseFloat(form.amountInvested),
          Number.parseFloat(form.currentValue),
          dateTs,
          form.notes,
        );
      }
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this investment?")) return;
    await actor.deleteInvestment(id);
    load();
  };

  const typeColors: Record<string, string> = {
    stock: "bg-blue-500/10 text-blue-600",
    mutual_fund: "bg-purple-500/10 text-purple-600",
    etf: "bg-indigo-500/10 text-indigo-600",
    gold: "bg-yellow-500/10 text-yellow-600",
    crypto: "bg-orange-500/10 text-orange-600",
  };

  return (
    <div data-ocid="investments.page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investments</h1>
        <Button data-ocid="investments.add_button" size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add Investment
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Invested</p>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrencyWithCode(portfolio.totalInvested, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className="text-lg font-bold">
              {formatCurrencyWithCode(portfolio.totalCurrentValue, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Profit / Loss</p>
            <p
              className={`text-lg font-bold ${portfolio.totalProfitLoss >= 0 ? "text-green-600" : "text-red-500"}`}
            >
              {portfolio.totalProfitLoss >= 0 ? "+" : ""}
              {formatCurrencyWithCode(portfolio.totalProfitLoss, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div
          data-ocid="investments.loading_state"
          className="flex justify-center py-12"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : investments.length === 0 ? (
        <div
          data-ocid="investments.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No investments tracked</p>
        </div>
      ) : (
        <div className="space-y-2">
          {investments.map((inv, i) => {
            const pl = inv.currentValue - inv.amountInvested;
            const plPct =
              inv.amountInvested > 0 ? (pl / inv.amountInvested) * 100 : 0;
            return (
              <div
                data-ocid={`investments.item.${i + 1}`}
                key={String(inv.id)}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    className={typeColors[inv.investmentType] ?? ""}
                    variant="secondary"
                  >
                    {inv.investmentType.replace("_", " ").toUpperCase()}
                  </Badge>
                  <div>
                    <p className="font-medium">{inv.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(inv.date)}
                      {inv.notes ? ` · ${inv.notes}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-muted-foreground">
                      Invested:{" "}
                      {formatCurrencyWithCode(inv.amountInvested, currency)}
                    </p>
                    <p className="text-sm font-medium">
                      Value:{" "}
                      {formatCurrencyWithCode(inv.currentValue, currency)}
                    </p>
                  </div>
                  <div
                    className={`text-right ${pl >= 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    <div className="flex items-center gap-1">
                      {pl >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="font-bold">
                        {formatCurrencyWithCode(Math.abs(pl), currency)}
                      </span>
                    </div>
                    <p className="text-xs">
                      {plPct >= 0 ? "+" : ""}
                      {plPct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      data-ocid={`investments.edit_button.${i + 1}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(inv)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      data-ocid={`investments.delete_button.${i + 1}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(inv.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="investments.dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Investment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                data-ocid="investments.name.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Apple Stock"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.investmentType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, investmentType: v }))
                }
              >
                <SelectTrigger data-ocid="investments.type.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount Invested</Label>
                <Input
                  data-ocid="investments.invested.input"
                  type="number"
                  value={form.amountInvested}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amountInvested: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Current Value</Label>
                <Input
                  data-ocid="investments.value.input"
                  type="number"
                  value={form.currentValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currentValue: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                data-ocid="investments.date.input"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                data-ocid="investments.notes.textarea"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              data-ocid="investments.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="investments.save_button"
              onClick={handleSave}
              disabled={saving || !form.name || !form.amountInvested}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
