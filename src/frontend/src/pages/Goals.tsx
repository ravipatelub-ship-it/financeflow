import { Pencil, Plus, PlusCircle, Target, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Goal, backendInterface } from "../backend";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
import { Textarea } from "../components/ui/textarea";
import { useCurrency } from "../context/CurrencyContext";
import { formatCurrencyWithCode, formatDate } from "../lib/format";

interface Props {
  actor: backendInterface;
}
const emptyForm = {
  name: "",
  targetAmount: "",
  currentAmount: "",
  deadline: "",
  monthlyContribution: "",
  notes: "",
};

export default function Goals({ actor }: Props) {
  const { currency } = useCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState<bigint | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setGoals(await actor.getAllGoals());
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
  const openEdit = (g: Goal) => {
    setForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      currentAmount: String(g.currentAmount),
      deadline: new Date(Number(g.deadline)).toISOString().slice(0, 10),
      monthlyContribution: String(g.monthlyContribution),
      notes: g.notes,
    });
    setEditingId(g.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const deadline = BigInt(new Date(form.deadline || Date.now()).getTime());
      if (editingId !== null) {
        await actor.updateGoal(
          editingId,
          form.name,
          Number.parseFloat(form.targetAmount),
          Number.parseFloat(form.currentAmount) || 0,
          deadline,
          Number.parseFloat(form.monthlyContribution) || 0,
          form.notes,
        );
      } else {
        await actor.createGoal(
          form.name,
          Number.parseFloat(form.targetAmount),
          Number.parseFloat(form.currentAmount) || 0,
          deadline,
          Number.parseFloat(form.monthlyContribution) || 0,
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
    if (!confirm("Delete this goal?")) return;
    await actor.deleteGoal(id);
    load();
  };

  const handleContribute = async (goalId: bigint) => {
    const amount = Number.parseFloat(contributeAmount);
    if (!amount) return;
    setSaving(true);
    try {
      await actor.contributeToGoal(goalId, amount);
      setContributeOpen(null);
      setContributeAmount("");
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-ocid="goals.page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Goals</h1>
        <Button data-ocid="goals.add_button" size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add Goal
        </Button>
      </div>

      {loading ? (
        <div
          data-ocid="goals.loading_state"
          className="flex justify-center py-12"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div
          data-ocid="goals.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No goals yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g, i) => {
            const pct = Math.min(
              100,
              Math.round((g.currentAmount / g.targetAmount) * 100),
            );
            return (
              <Card
                data-ocid={`goals.item.${i + 1}`}
                key={String(g.id)}
                className="border"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        data-ocid={`goals.contribute_button.${i + 1}`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setContributeOpen(g.id);
                          setContributeAmount(String(g.monthlyContribution));
                        }}
                      >
                        <PlusCircle className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                      <Button
                        data-ocid={`goals.edit_button.${i + 1}`}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(g)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        data-ocid={`goals.delete_button.${i + 1}`}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(g.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-blue-600">
                      {formatCurrencyWithCode(g.currentAmount, currency)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      of {formatCurrencyWithCode(g.targetAmount, currency)}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {pct}% complete
                      </span>
                      {g.deadline > 0n && (
                        <span className="text-muted-foreground">
                          By {formatDate(g.deadline)}
                        </span>
                      )}
                    </div>
                    <Progress value={pct} className="h-3" />
                  </div>
                  {g.monthlyContribution > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Monthly contribution:{" "}
                      {formatCurrencyWithCode(g.monthlyContribution, currency)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="goals.dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Goal Name</Label>
              <Input
                data-ocid="goals.name.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Emergency Fund"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target Amount</Label>
                <Input
                  data-ocid="goals.target.input"
                  type="number"
                  value={form.targetAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetAmount: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Current Amount</Label>
                <Input
                  data-ocid="goals.current.input"
                  type="number"
                  value={form.currentAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currentAmount: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Deadline</Label>
                <Input
                  data-ocid="goals.deadline.input"
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deadline: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Monthly Contribution</Label>
                <Input
                  data-ocid="goals.contribution.input"
                  type="number"
                  value={form.monthlyContribution}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      monthlyContribution: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                data-ocid="goals.notes.textarea"
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
              data-ocid="goals.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="goals.save_button"
              onClick={handleSave}
              disabled={saving || !form.name || !form.targetAmount}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={contributeOpen !== null}
        onOpenChange={() => setContributeOpen(null)}
      >
        <DialogContent data-ocid="goals.contribute.dialog">
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Amount</Label>
            <Input
              data-ocid="goals.contribute.amount.input"
              type="number"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              data-ocid="goals.contribute.cancel_button"
              variant="outline"
              onClick={() => setContributeOpen(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="goals.contribute.confirm_button"
              onClick={() =>
                contributeOpen !== null && handleContribute(contributeOpen)
              }
              disabled={saving}
            >
              Contribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
