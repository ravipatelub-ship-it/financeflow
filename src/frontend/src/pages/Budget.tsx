import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  Budget as BudgetType,
  Category,
  CategorySpending,
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
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useCurrency } from "../context/CurrencyContext";
import {
  formatCurrencyWithCode,
  getCurrencySymbol,
  getCurrentMonth,
  monthLabel,
} from "../lib/format";

interface Props {
  actor: backendInterface;
}

export default function Budget({ actor }: Props) {
  const { currency } = useCurrency();
  const [month, setMonth] = useState(getCurrentMonth());
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState({ categoryId: "", limitAmount: "" });
  const [saving, setSaving] = useState(false);

  const changeMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const load = async () => {
    setLoading(true);
    const [allBudgets, cats, spendData] = await Promise.all([
      actor.getAllBudgets(),
      actor.getAllCategories(),
      actor.getCategorySpending(month),
    ]);
    setBudgets(allBudgets.filter((b) => b.month === month));
    setCategories(cats);
    setSpending(spendData);
    setLoading(false);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: load is recreated each render
  useEffect(() => {
    load();
  }, [actor, month]);

  const openAdd = () => {
    setForm({ categoryId: "", limitAmount: "" });
    setEditingId(null);
    setDialogOpen(true);
  };
  const openEdit = (b: BudgetType) => {
    setForm({
      categoryId: String(b.categoryId),
      limitAmount: String(b.limitAmount),
    });
    setEditingId(b.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const spent =
        spending.find((s) => s.categoryId === BigInt(form.categoryId))
          ?.totalSpent ?? 0;
      if (editingId !== null) {
        await actor.updateBudget(
          editingId,
          BigInt(form.categoryId),
          month,
          Number.parseFloat(form.limitAmount),
          spent,
        );
      } else {
        await actor.createBudget(
          BigInt(form.categoryId),
          month,
          Number.parseFloat(form.limitAmount),
          spent,
        );
      }
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this budget?")) return;
    await actor.deleteBudget(id);
    load();
  };

  return (
    <div data-ocid="budget.page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Budget</h1>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="budget.prev.button"
            variant="outline"
            size="icon"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-32 text-center">
            {monthLabel(month)}
          </span>
          <Button
            data-ocid="budget.next.button"
            variant="outline"
            size="icon"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button data-ocid="budget.add_button" size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Set Budget
          </Button>
        </div>
      </div>

      {loading ? (
        <div
          data-ocid="budget.loading_state"
          className="flex justify-center py-12"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : budgets.length === 0 ? (
        <div
          data-ocid="budget.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <p className="font-medium">No budgets set for {monthLabel(month)}</p>
          <p className="text-sm">Set spending limits per category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b: BudgetType, i: number) => {
            const cat = categories.find((c) => c.id === b.categoryId);
            const spent =
              spending.find((s) => s.categoryId === b.categoryId)?.totalSpent ??
              0;
            const pct = Math.min(
              100,
              Math.round((spent / b.limitAmount) * 100),
            );
            const isOver = spent > b.limitAmount;
            return (
              <Card
                data-ocid={`budget.item.${i + 1}`}
                key={String(b.id)}
                className={`border ${isOver ? "border-red-400" : ""}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {cat && (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ background: cat.color }}
                        />
                      )}
                      <span className="font-medium">
                        {cat?.name ?? "Unknown"}
                      </span>
                      {isOver && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Over Budget
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        data-ocid={`budget.edit_button.${i + 1}`}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openEdit(b)}
                      >
                        Edit
                      </Button>
                      <Button
                        data-ocid={`budget.delete_button.${i + 1}`}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={() => handleDelete(b.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span
                        className={
                          isOver
                            ? "text-red-500 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {formatCurrencyWithCode(spent, currency)} spent
                      </span>
                      <span className="text-muted-foreground">
                        of {formatCurrencyWithCode(b.limitAmount, currency)}
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className={`h-2 ${isOver ? "[&>div]:bg-red-500" : ""}`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {isOver
                        ? `${formatCurrencyWithCode(spent - b.limitAmount, currency)} over budget`
                        : `${formatCurrencyWithCode(b.limitAmount - spent, currency)} remaining`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="budget.dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Set"} Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger data-ocid="budget.category.select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monthly Limit</Label>
              <Input
                data-ocid="budget.limit.input"
                type="number"
                value={form.limitAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, limitAmount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              data-ocid="budget.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="budget.save_button"
              onClick={handleSave}
              disabled={saving || !form.categoryId || !form.limitAmount}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
