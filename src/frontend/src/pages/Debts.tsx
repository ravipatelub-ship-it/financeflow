import { AlertTriangle, DollarSign, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Debt, backendInterface } from "../backend";
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
  lender: "",
  totalAmount: "",
  interestRate: "",
  emiAmount: "",
  dueDate: "",
  remainingBalance: "",
  startDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function Debts({ actor }: Props) {
  const { currency } = useCurrency();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState<bigint | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setDebts(await actor.getAllDebts());
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
  const openEdit = (d: Debt) => {
    setForm({
      name: d.name,
      lender: d.lender,
      totalAmount: String(d.totalAmount),
      interestRate: String(d.interestRate),
      emiAmount: String(d.emiAmount),
      dueDate: new Date(Number(d.dueDate)).toISOString().slice(0, 10),
      remainingBalance: String(d.remainingBalance),
      startDate: new Date(Number(d.startDate)).toISOString().slice(0, 10),
      notes: d.notes,
    });
    setEditingId(d.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const totalAmount = Number.parseFloat(form.totalAmount);
      const remaining = Number.parseFloat(form.remainingBalance) || totalAmount;
      const dueDate = BigInt(new Date(form.dueDate || Date.now()).getTime());
      const startDate = BigInt(new Date(form.startDate).getTime());
      if (editingId !== null) {
        await actor.updateDebt(
          editingId,
          form.name,
          form.lender,
          totalAmount,
          Number.parseFloat(form.interestRate) || 0,
          Number.parseFloat(form.emiAmount) || 0,
          dueDate,
          remaining,
          startDate,
          form.notes,
        );
      } else {
        await actor.createDebt(
          form.name,
          form.lender,
          totalAmount,
          Number.parseFloat(form.interestRate) || 0,
          Number.parseFloat(form.emiAmount) || 0,
          dueDate,
          remaining,
          startDate,
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
    if (!confirm("Delete this debt?")) return;
    await actor.deleteDebt(id);
    load();
  };

  const handlePayment = async (debtId: bigint) => {
    const amount = Number.parseFloat(paymentAmount);
    if (!amount) return;
    setSaving(true);
    try {
      await actor.recordDebtPayment(debtId, amount);
      setPaymentOpen(null);
      setPaymentAmount("");
      load();
    } finally {
      setSaving(false);
    }
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.remainingBalance, 0);

  return (
    <div data-ocid="debts.page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debts</h1>
          <p className="text-muted-foreground text-sm">
            Total remaining:{" "}
            <span className="font-semibold text-red-500">
              {formatCurrencyWithCode(totalDebt, currency)}
            </span>
          </p>
        </div>
        <Button data-ocid="debts.add_button" size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add Debt
        </Button>
      </div>

      {loading ? (
        <div
          data-ocid="debts.loading_state"
          className="flex justify-center py-12"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : debts.length === 0 ? (
        <div
          data-ocid="debts.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No debts tracked</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.map((d, i) => {
            const paidPct = Math.round(
              ((d.totalAmount - d.remainingBalance) / d.totalAmount) * 100,
            );
            return (
              <Card
                data-ocid={`debts.item.${i + 1}`}
                key={String(d.id)}
                className="border"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{d.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {d.lender}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        data-ocid={`debts.pay_button.${i + 1}`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPaymentOpen(d.id);
                          setPaymentAmount(String(d.emiAmount));
                        }}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Pay
                      </Button>
                      <Button
                        data-ocid={`debts.edit_button.${i + 1}`}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(d)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        data-ocid={`debts.delete_button.${i + 1}`}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(d.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">
                        {formatCurrencyWithCode(d.remainingBalance, currency)}{" "}
                        remaining
                      </span>
                      <span className="font-medium text-green-600">
                        {paidPct}% paid
                      </span>
                    </div>
                    <Progress value={paidPct} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-medium">
                        {formatCurrencyWithCode(d.totalAmount, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">EMI</p>
                      <p className="font-medium">
                        {formatCurrencyWithCode(d.emiAmount, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rate</p>
                      <p className="font-medium">{d.interestRate}%</p>
                    </div>
                  </div>
                  {d.dueDate > 0n && (
                    <p className="text-xs text-muted-foreground">
                      Due: {formatDate(d.dueDate)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="debts.dialog"
          className="max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Debt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Debt Name</Label>
                <Input
                  data-ocid="debts.name.input"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Home Loan"
                />
              </div>
              <div>
                <Label>Lender</Label>
                <Input
                  data-ocid="debts.lender.input"
                  value={form.lender}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lender: e.target.value }))
                  }
                  placeholder="Bank name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Amount</Label>
                <Input
                  data-ocid="debts.total.input"
                  type="number"
                  value={form.totalAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, totalAmount: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Remaining Balance</Label>
                <Input
                  data-ocid="debts.remaining.input"
                  type="number"
                  value={form.remainingBalance}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remainingBalance: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Interest Rate (%)</Label>
                <Input
                  data-ocid="debts.rate.input"
                  type="number"
                  value={form.interestRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, interestRate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>EMI Amount</Label>
                <Input
                  data-ocid="debts.emi.input"
                  type="number"
                  value={form.emiAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, emiAmount: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  data-ocid="debts.startdate.input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  data-ocid="debts.duedate.input"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                data-ocid="debts.notes.textarea"
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
              data-ocid="debts.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="debts.save_button"
              onClick={handleSave}
              disabled={saving || !form.name || !form.totalAmount}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={paymentOpen !== null}
        onOpenChange={() => setPaymentOpen(null)}
      >
        <DialogContent data-ocid="debts.payment.dialog">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Payment Amount</Label>
            <Input
              data-ocid="debts.payment.amount.input"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              data-ocid="debts.payment.cancel_button"
              variant="outline"
              onClick={() => setPaymentOpen(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="debts.payment.confirm_button"
              onClick={() => paymentOpen !== null && handlePayment(paymentOpen)}
              disabled={saving}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
