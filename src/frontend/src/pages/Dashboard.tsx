import {
  BarChart2,
  Landmark,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Page } from "../App";
import type {
  Account,
  Category,
  CategorySpending,
  Debt,
  Investment,
  MonthlySummary,
  PortfolioSummary,
  backendInterface,
} from "../backend";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useCurrency } from "../context/CurrencyContext";
import {
  formatCurrencyWithCode,
  getCurrencySymbol,
  getCurrentMonth,
} from "../lib/format";

interface Props {
  actor: backendInterface;
  setPage: (p: Page) => void;
}

export default function Dashboard({ actor, setPage }: Props) {
  const { currency } = useCurrency();
  const [totalBalance, setTotalBalance] = useState(0);
  const [summary, setSummary] = useState<MonthlySummary>({
    totalIncome: 0,
    totalExpenses: 0,
    savings: 0,
  });
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>(
    [],
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [monthlyData, setMonthlyData] = useState<
    { month: string; income: number; expenses: number }[]
  >([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalProfitLoss: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [bal, cats, accs, dbs, invs, pf] = await Promise.all([
          actor.getTotalBalance(),
          actor.getAllCategories(),
          actor.getAllAccounts(),
          actor.getAllDebts(),
          actor.getAllInvestments(),
          actor.getPortfolioSummary(),
        ]);
        setTotalBalance(bal);
        setCategories(cats);
        setAccounts(accs);
        setDebts(dbs);
        setInvestments(invs);
        setPortfolio(pf);

        const currentMonth = getCurrentMonth();
        const [sum, catSpend] = await Promise.all([
          actor.getMonthlySummary(currentMonth),
          actor.getCategorySpending(currentMonth),
        ]);
        setSummary(sum);
        setCategorySpending(catSpend);

        const now = new Date();
        const months: string[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          );
        }
        const monthSummaries = await Promise.all(
          months.map((m) => actor.getMonthlySummary(m)),
        );
        setMonthlyData(
          months.map((m, i) => ({
            month: m.slice(5),
            income: monthSummaries[i].totalIncome,
            expenses: monthSummaries[i].totalExpenses,
          })),
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [actor]);

  const totalDebt = debts.reduce((sum, d) => sum + d.remainingBalance, 0);
  const netWorth = totalBalance + portfolio.totalCurrentValue - totalDebt;

  const pieData = categorySpending
    .filter((cs) => cs.totalSpent > 0)
    .map((cs) => {
      const cat = categories.find((c) => c.id === cs.categoryId);
      return {
        name: cat?.name ?? "Unknown",
        value: cs.totalSpent,
        color: cat?.color ?? "#94a3b8",
      };
    });

  const investmentTypeColors: Record<string, string> = {
    stock: "text-blue-600",
    mutual_fund: "text-purple-600",
    etf: "text-indigo-600",
    gold: "text-yellow-600",
    crypto: "text-orange-500",
  };

  if (loading)
    return (
      <div
        data-ocid="dashboard.loading_state"
        className="flex items-center justify-center h-64"
      >
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div data-ocid="dashboard.page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Net Worth Banner */}
      <Card
        data-ocid="dashboard.networth.card"
        className="border-2 border-primary/20 bg-primary/5"
      >
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                Net Worth
              </p>
              <p
                className={`text-3xl font-extrabold ${
                  netWorth >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {formatCurrencyWithCode(netWorth, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Accounts + Investments &minus; Debts
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <p className="text-xs text-muted-foreground">Accounts</p>
                <p className="font-bold text-blue-600 text-sm">
                  {formatCurrencyWithCode(totalBalance, currency)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-muted-foreground">Investments</p>
                <p className="font-bold text-green-600 text-sm">
                  {formatCurrencyWithCode(
                    portfolio.totalCurrentValue,
                    currency,
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <p className="text-xs text-muted-foreground">Debts</p>
                <p className="font-bold text-red-500 text-sm">
                  -{formatCurrencyWithCode(totalDebt, currency)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Balance",
            value: formatCurrencyWithCode(totalBalance, currency),
            icon: <Wallet className="w-5 h-5" />,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "Monthly Income",
            value: formatCurrencyWithCode(summary.totalIncome, currency),
            icon: <TrendingUp className="w-5 h-5" />,
            color: "text-green-500",
            bg: "bg-green-500/10",
          },
          {
            label: "Monthly Expenses",
            value: formatCurrencyWithCode(summary.totalExpenses, currency),
            icon: <TrendingDown className="w-5 h-5" />,
            color: "text-red-500",
            bg: "bg-red-500/10",
          },
        ].map((card) => (
          <Card key={card.label} className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <span className={card.color}>{card.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {card.label}
                  </p>
                  <p className={`text-lg font-bold ${card.color} truncate`}>
                    {card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accounts Summary */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {accounts.map((acc) => (
                <div
                  key={String(acc.id)}
                  className="p-3 rounded-lg bg-muted/50 border"
                >
                  <p className="text-xs text-muted-foreground capitalize">
                    {acc.accountType.replace("_", " ")}
                  </p>
                  <p className="font-semibold text-sm truncate">{acc.name}</p>
                  <p
                    className={`font-bold ${
                      acc.balance >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {formatCurrencyWithCode(acc.balance, currency)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investments & Debts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investments Section */}
        <Card data-ocid="dashboard.investments.card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" /> Investments
              </CardTitle>
              <button
                type="button"
                onClick={() => setPage("investments")}
                className="text-xs text-primary hover:underline"
              >
                View all
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Invested</p>
                <p className="font-bold text-sm text-blue-600">
                  {formatCurrencyWithCode(portfolio.totalInvested, currency)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="font-bold text-sm">
                  {formatCurrencyWithCode(
                    portfolio.totalCurrentValue,
                    currency,
                  )}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">P&amp;L</p>
                <p
                  className={`font-bold text-sm ${
                    portfolio.totalProfitLoss >= 0
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {portfolio.totalProfitLoss >= 0 ? "+" : ""}
                  {formatCurrencyWithCode(portfolio.totalProfitLoss, currency)}
                </p>
              </div>
            </div>
            {investments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                No investments yet
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {investments.slice(0, 5).map((inv) => {
                  const pl = inv.currentValue - inv.amountInvested;
                  return (
                    <div
                      key={String(inv.id)}
                      className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-xs font-semibold uppercase ${
                            investmentTypeColors[inv.investmentType] ??
                            "text-muted-foreground"
                          }`}
                        >
                          {inv.investmentType.replace("_", " ")}
                        </span>
                        <span className="truncate text-foreground font-medium">
                          {inv.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-medium">
                          {formatCurrencyWithCode(inv.currentValue, currency)}
                        </p>
                        <p
                          className={`text-xs ${
                            pl >= 0 ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {pl >= 0 ? "+" : ""}
                          {formatCurrencyWithCode(pl, currency)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debts Section */}
        <Card data-ocid="dashboard.debts.card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="w-4 h-4 text-red-500" /> Debts
              </CardTitle>
              <button
                type="button"
                onClick={() => setPage("debts")}
                className="text-xs text-primary hover:underline"
              >
                View all
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10">
              <p className="text-sm text-muted-foreground">Total Remaining</p>
              <p className="font-bold text-red-500">
                {formatCurrencyWithCode(totalDebt, currency)}
              </p>
            </div>
            {debts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                No debts tracked
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {debts.slice(0, 5).map((d) => {
                  const paidPct = Math.round(
                    ((d.totalAmount - d.remainingBalance) / d.totalAmount) *
                      100,
                  );
                  return (
                    <div
                      key={String(d.id)}
                      className="py-2 border-b last:border-0 space-y-1"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <span className="font-medium truncate block">
                            {d.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {d.lender}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-red-500">
                            {formatCurrencyWithCode(
                              d.remainingBalance,
                              currency,
                            )}
                          </p>
                          <p className="text-xs text-green-600">
                            {paidPct}% paid
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Income vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) =>
                    `${getCurrencySymbol(currency)}${(v / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  formatter={(v: number) => formatCurrencyWithCode(v, currency)}
                />
                <Bar
                  dataKey="income"
                  fill="#22c55e"
                  name="Income"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="#ef4444"
                  name="Expenses"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                  >
                    {pieData.map((entry, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: recharts Cell requires index
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) =>
                      formatCurrencyWithCode(v, currency)
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No expense data this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
