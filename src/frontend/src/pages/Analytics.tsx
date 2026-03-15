import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category, CategorySpending, backendInterface } from "../backend";
import { Button } from "../components/ui/button";
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
  monthLabel,
} from "../lib/format";

interface Props {
  actor: backendInterface;
}

export default function Analytics({ actor }: Props) {
  const { currency } = useCurrency();
  const [month, setMonth] = useState(getCurrentMonth());
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>(
    [],
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<
    { month: string; income: number; expenses: number; savings: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const changeMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: stable
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [cats, catSpend] = await Promise.all([
        actor.getAllCategories(),
        actor.getCategorySpending(month),
      ]);
      setCategories(cats);
      setCategorySpending(catSpend);

      // 6 months trend
      const now = new Date();
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        );
      }
      const summaries = await Promise.all(
        months.map((m) => actor.getMonthlySummary(m)),
      );
      setMonthlyTrend(
        months.map((m, i) => ({
          month: m.slice(5),
          income: summaries[i].totalIncome,
          expenses: summaries[i].totalExpenses,
          savings: summaries[i].savings,
        })),
      );
      setLoading(false);
    };
    load();
  }, [actor, month]);

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

  return (
    <div data-ocid="analytics.page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="analytics.prev.button"
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
            data-ocid="analytics.next.button"
            variant="outline"
            size="icon"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div
          data-ocid="analytics.loading_state"
          className="flex justify-center py-12"
        >
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Monthly Trend (6 months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    strokeOpacity={0.1}
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) =>
                      formatCurrencyWithCode(v, currency)
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Income"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Expenses"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Savings"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Spending by Category – {monthLabel(month)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
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
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  No expense data for this month
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Income vs Expenses (6 months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    strokeOpacity={0.1}
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) =>
                      formatCurrencyWithCode(v, currency)
                    }
                  />
                  <Legend />
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
        </div>
      )}
    </div>
  );
}
