import { Shield, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import { Button } from "./components/ui/button";
import { CurrencyProvider } from "./context/CurrencyContext";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import Accounts from "./pages/Accounts";
import Budget from "./pages/Budget";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import Debts from "./pages/Debts";
import Goals from "./pages/Goals";
import Investments from "./pages/Investments";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";

export type Page =
  | "dashboard"
  | "accounts"
  | "transactions"
  | "categories"
  | "debts"
  | "goals"
  | "investments"
  | "budget"
  | "settings";

export default function App() {
  const { identity, login, isInitializing, isLoggingIn, clear } =
    useInternetIdentity();
  const { actor } = useActor();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  // Seed categories on first login
  useEffect(() => {
    if (!actor || !identity) return;
    const seedCategories = async () => {
      try {
        const cats = await actor.getAllCategories();
        if (cats.length === 0) {
          const defaults = [
            { name: "Food", color: "#ef4444" },
            { name: "Transport", color: "#f97316" },
            { name: "Rent", color: "#8b5cf6" },
            { name: "Utilities", color: "#3b82f6" },
            { name: "Shopping", color: "#ec4899" },
            { name: "Entertainment", color: "#14b8a6" },
            { name: "Medical", color: "#dc2626" },
            { name: "Education", color: "#6366f1" },
            { name: "Investment", color: "#22c55e" },
            { name: "Others", color: "#94a3b8" },
          ];
          for (const cat of defaults) {
            await actor.createCategory(cat.name, cat.color, true);
          }
        }
      } catch (e) {
        console.error("Failed to seed categories", e);
      }
    };
    seedCategories();
  }, [actor, identity]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div data-ocid="app.loading_state" className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          data-ocid="login.page"
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary rounded-2xl p-4">
              <Wallet className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            FinanceFlow
          </h1>
          <p className="text-muted-foreground mb-8">
            Your complete personal finance manager. Track income, expenses,
            debts, goals, and investments in one place.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-muted-foreground">Track Wealth</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border">
              <Wallet className="w-5 h-5 text-blue-500" />
              <span className="text-muted-foreground">Manage Budgets</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border">
              <Shield className="w-5 h-5 text-purple-500" />
              <span className="text-muted-foreground">Secure & Private</span>
            </div>
          </div>
          <Button
            data-ocid="login.primary_button"
            size="lg"
            className="w-full"
            onClick={login}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Connecting..." : "Sign in with Internet Identity"}
          </Button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (!actor)
      return (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    switch (currentPage) {
      case "dashboard":
        return <Dashboard actor={actor} setPage={setCurrentPage} />;
      case "accounts":
        return <Accounts actor={actor} />;
      case "transactions":
        return <Transactions actor={actor} />;
      case "categories":
        return <Categories actor={actor} />;
      case "debts":
        return <Debts actor={actor} />;
      case "goals":
        return <Goals actor={actor} />;
      case "investments":
        return <Investments actor={actor} />;
      case "budget":
        return <Budget actor={actor} />;
      case "settings":
        return (
          <Settings
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onSignOut={clear}
          />
        );
      default:
        return <Dashboard actor={actor} setPage={setCurrentPage} />;
    }
  };

  return (
    <CurrencyProvider>
      <Layout
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      >
        {renderPage()}
      </Layout>
    </CurrencyProvider>
  );
}
