import {
  Download,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  Account,
  Category,
  Transaction,
  backendInterface,
} from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { useCurrency } from "../context/CurrencyContext";
import { formatCurrencyWithCode, formatDate } from "../lib/format";

interface Props {
  actor: backendInterface;
}

const emptyForm = {
  transactionType: "expense",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  categoryId: "",
  source: "salary",
  accountId: "",
  notes: "",
};

export default function Transactions({ actor }: Props) {
  const { currency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [txs, accs, cats] = await Promise.all([
      actor.getAllTransactions(),
      actor.getAllAccounts(),
      actor.getAllCategories(),
    ]);
    setTransactions(txs.sort((a, b) => Number(b.date) - Number(a.date)));
    setAccounts(accs);
    setCategories(cats);
    setLoading(false);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load is recreated each render
  useEffect(() => {
    load();
  }, [actor]);

  const filtered = transactions.filter(
    (t) =>
      (filter === "all" || t.transactionType === filter) &&
      (accountFilter === "all" || String(t.accountId) === accountFilter),
  );

  const openAdd = (type: "income" | "expense" = "expense") => {
    setForm({
      ...emptyForm,
      transactionType: type,
      accountId: "",
      categoryId: categories[0] ? String(categories[0].id) : "",
    });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (t: Transaction) => {
    const dateStr = new Date(Number(t.date)).toISOString().slice(0, 10);
    setForm({
      transactionType: t.transactionType,
      amount: String(t.amount),
      date: dateStr,
      categoryId: String(t.categoryId),
      source: t.source || "salary",
      accountId: String(t.accountId),
      notes: t.notes,
    });
    setEditingId(t.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dateTs = BigInt(new Date(form.date).getTime());
      const amt = Number.parseFloat(form.amount);
      const catId = BigInt(form.categoryId || "0");
      const accId = BigInt(form.accountId || "0");
      if (editingId !== null) {
        await actor.updateTransaction(
          editingId,
          form.transactionType,
          amt,
          dateTs,
          catId,
          form.source,
          accId,
          form.notes,
        );
      } else {
        await actor.createTransaction(
          form.transactionType,
          amt,
          dateTs,
          catId,
          form.source,
          accId,
          form.notes,
        );
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      console.error("Failed to save transaction:", err);
      alert("Failed to save transaction. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this transaction?")) return;
    await actor.deleteTransaction(id);
    load();
  };

  const exportCSV = () => {
    const rows = [
      ["Type", "Amount", "Date", "Category", "Source", "Account", "Notes"],
    ];
    for (const t of transactions) {
      const cat = categories.find((c) => c.id === t.categoryId)?.name ?? "";
      const acc = accounts.find((a) => a.id === t.accountId)?.name ?? "";
      rows.push([
        t.transactionType,
        String(t.amount),
        formatDate(t.date),
        cat,
        t.source,
        acc,
        t.notes,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-ocid="transactions.page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Button
            data-ocid="transactions.export.button"
            variant="outline"
            size="sm"
            onClick={exportCSV}
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
          <Button
            data-ocid="transactions.add_income.button"
            variant="outline"
            size="sm"
            className="text-green-600 border-green-300"
            onClick={() => openAdd("income")}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Income
          </Button>
          <Button
            data-ocid="transactions.add_button"
            size="sm"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => openAdd("expense")}
          >
            <TrendingDown className="w-4 h-4 mr-1" />
            Expense
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList>
            <TabsTrigger data-ocid="transactions.all.tab" value="all">
              All
            </TabsTrigger>
            <TabsTrigger data-ocid="transactions.income.tab" value="income">
              Income
            </TabsTrigger>
            <TabsTrigger data-ocid="transactions.expense.tab" value="expense">
              Expenses
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {accounts.length > 0 && (
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger
              data-ocid="transactions.account_filter.select"
              className="w-44"
            >
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={String(a.id)} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div
          data-ocid="transactions.loading_state"
          className="flex justify-center py-12"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-ocid="transactions.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <p className="font-medium">No transactions</p>
          <p className="text-sm">Add your first transaction above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => {
            const cat = categories.find((c) => c.id === t.categoryId);
            const acc = accounts.find((a) => a.id === t.accountId);
            return (
              <div
                data-ocid={`transactions.item.${i + 1}`}
                key={String(t.id)}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${t.transactionType === "income" ? "bg-green-500/10" : "bg-red-500/10"}`}
                  >
                    {t.transactionType === "income" ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {cat && (
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ background: cat.color }}
                        />
                      )}
                      <p className="font-medium text-sm">
                        {cat?.name ?? t.source}
                      </p>
                      {acc && (
                        <Badge variant="outline" className="text-xs">
                          {acc.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.date)}
                      {t.notes ? ` · ${t.notes}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold ${t.transactionType === "income" ? "text-green-600" : "text-red-500"}`}
                  >
                    {t.transactionType === "income" ? "+" : "-"}
                    {formatCurrencyWithCode(t.amount, currency)}
                  </span>
                  <Button
                    data-ocid={`transactions.edit_button.${i + 1}`}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(t)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    data-ocid={`transactions.delete_button.${i + 1}`}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="transactions.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Add"}{" "}
              {form.transactionType === "income" ? "Income" : "Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select
                value={form.transactionType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, transactionType: v }))
                }
              >
                <SelectTrigger data-ocid="transactions.type.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                data-ocid="transactions.amount.input"
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                data-ocid="transactions.date.input"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            {form.transactionType === "expense" ? (
              <div>
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, categoryId: v }))
                  }
                >
                  <SelectTrigger data-ocid="transactions.category.select">
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
            ) : (
              <div>
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}
                >
                  <SelectTrigger data-ocid="transactions.source.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="side_income">Side Income</SelectItem>
                    <SelectItem value="investment">
                      Investment Returns
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Account</Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
              >
                <SelectTrigger data-ocid="transactions.account.select">
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
              <Label>Notes</Label>
              <Textarea
                data-ocid="transactions.notes.textarea"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Optional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              data-ocid="transactions.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="transactions.save_button"
              onClick={handleSave}
              disabled={saving || !form.amount || !form.accountId}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
