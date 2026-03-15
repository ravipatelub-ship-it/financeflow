import {
  ArrowLeftRight,
  Building,
  CreditCard,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Account, backendInterface } from "../backend";
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
import { useCurrency } from "../context/CurrencyContext";
import { formatCurrencyWithCode } from "../lib/format";

const accountTypeIcons: Record<string, React.ReactNode> = {
  bank: <Building className="w-5 h-5" />,
  cash: <Wallet className="w-5 h-5" />,
  credit_card: <CreditCard className="w-5 h-5" />,
  investment: <TrendingUp className="w-5 h-5" />,
};

const accountTypeColors: Record<string, string> = {
  bank: "bg-blue-500/10 text-blue-600",
  cash: "bg-green-500/10 text-green-600",
  credit_card: "bg-red-500/10 text-red-600",
  investment: "bg-purple-500/10 text-purple-600",
};

interface Props {
  actor: backendInterface;
}

const emptyForm = { name: "", accountType: "bank", balance: "", notes: "" };

export default function Accounts({ actor }: Props) {
  const { currency } = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [transfer, setTransfer] = useState({
    fromId: "",
    toId: "",
    amount: "",
  });
  const [saving, setSaving] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);

  const load = async () => {
    setLoading(true);
    const [accs, bal] = await Promise.all([
      actor.getAllAccounts(),
      actor.getTotalBalance(),
    ]);
    setAccounts(accs);
    setTotalBalance(bal);
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
  const openEdit = (a: Account) => {
    setForm({
      name: a.name,
      accountType: a.accountType,
      balance: String(a.balance),
      notes: a.notes,
    });
    setEditingId(a.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const bal = Number.parseFloat(form.balance) || 0;
      if (editingId !== null) {
        await actor.updateAccount(
          editingId,
          form.name,
          form.accountType,
          bal,
          form.notes,
        );
      } else {
        await actor.createAccount(form.name, form.accountType, bal, form.notes);
      }
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this account?")) return;
    await actor.deleteAccount(id);
    load();
  };

  const handleTransfer = async () => {
    setSaving(true);
    try {
      await actor.transferBetweenAccounts(
        BigInt(transfer.fromId),
        BigInt(transfer.toId),
        Number.parseFloat(transfer.amount),
      );
      setTransferOpen(false);
      setTransfer({ fromId: "", toId: "", amount: "" });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-ocid="accounts.page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground text-sm">
            Total Balance:{" "}
            <span className="font-semibold text-green-600">
              {formatCurrencyWithCode(totalBalance, currency)}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            data-ocid="accounts.transfer.button"
            variant="outline"
            size="sm"
            onClick={() => setTransferOpen(true)}
          >
            <ArrowLeftRight className="w-4 h-4 mr-1" /> Transfer
          </Button>
          <Button data-ocid="accounts.add_button" size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Account
          </Button>
        </div>
      </div>

      {loading ? (
        <div
          data-ocid="accounts.loading_state"
          className="flex justify-center py-12"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div
          data-ocid="accounts.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No accounts yet</p>
          <p className="text-sm">Add your first account to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc, i) => (
            <Card
              data-ocid={`accounts.item.${i + 1}`}
              key={String(acc.id)}
              className="border"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${accountTypeColors[acc.accountType] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {accountTypeIcons[acc.accountType] ?? (
                        <Wallet className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{acc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {acc.accountType.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      data-ocid={`accounts.edit_button.${i + 1}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(acc)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      data-ocid={`accounts.delete_button.${i + 1}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(acc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <p
                    className={`text-2xl font-bold ${acc.balance >= 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {formatCurrencyWithCode(acc.balance, currency)}
                  </p>
                  {acc.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {acc.notes}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="accounts.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Account" : "Add Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                data-ocid="accounts.name.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Main Checking"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.accountType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, accountType: v }))
                }
              >
                <SelectTrigger data-ocid="accounts.type.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="cash">Cash Wallet</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="investment">Investment Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Balance</Label>
              <Input
                data-ocid="accounts.balance.input"
                type="number"
                value={form.balance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, balance: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                data-ocid="accounts.notes.input"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              data-ocid="accounts.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="accounts.save_button"
              onClick={handleSave}
              disabled={saving || !form.name}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent data-ocid="accounts.transfer.dialog">
          <DialogHeader>
            <DialogTitle>Transfer Between Accounts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>From Account</Label>
              <Select
                value={transfer.fromId}
                onValueChange={(v) => setTransfer((t) => ({ ...t, fromId: v }))}
              >
                <SelectTrigger data-ocid="accounts.transfer.from.select">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={String(a.id)} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To Account</Label>
              <Select
                value={transfer.toId}
                onValueChange={(v) => setTransfer((t) => ({ ...t, toId: v }))}
              >
                <SelectTrigger data-ocid="accounts.transfer.to.select">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={String(a.id)} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                data-ocid="accounts.transfer.amount.input"
                type="number"
                value={transfer.amount}
                onChange={(e) =>
                  setTransfer((t) => ({ ...t, amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              data-ocid="accounts.transfer.cancel_button"
              variant="outline"
              onClick={() => setTransferOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="accounts.transfer.confirm_button"
              onClick={handleTransfer}
              disabled={
                saving || !transfer.fromId || !transfer.toId || !transfer.amount
              }
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
