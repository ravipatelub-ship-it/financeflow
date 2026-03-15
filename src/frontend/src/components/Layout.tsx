import {
  AlertTriangle,
  ArrowLeftRight,
  Calculator,
  CreditCard,
  LayoutDashboard,
  Menu,
  Settings,
  Tag,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Page } from "../App";
import { Button } from "./ui/button";

const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  {
    page: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  { page: "accounts", label: "Accounts", icon: <Wallet className="w-5 h-5" /> },
  {
    page: "transactions",
    label: "Transactions",
    icon: <ArrowLeftRight className="w-5 h-5" />,
  },
  {
    page: "categories",
    label: "Categories",
    icon: <Tag className="w-5 h-5" />,
  },
  {
    page: "debts",
    label: "Debts",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  { page: "goals", label: "Goals", icon: <Target className="w-5 h-5" /> },
  {
    page: "investments",
    label: "Investments",
    icon: <TrendingUp className="w-5 h-5" />,
  },
  { page: "budget", label: "Budget", icon: <Calculator className="w-5 h-5" /> },
];

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  setCurrentPage: (p: Page) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

export default function Layout({
  children,
  currentPage,
  setCurrentPage,
}: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <div className="bg-primary rounded-lg p-1.5">
          <CreditCard className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg text-foreground">FinanceFlow</span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.page + item.label}
            data-ocid={`nav.${item.page}.link`}
            onClick={() => {
              setCurrentPage(item.page);
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === item.page
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <button
          type="button"
          data-ocid="nav.settings.link"
          onClick={() => {
            setCurrentPage("settings");
            setMobileOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === "settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />
          <aside className="relative flex flex-col w-64 bg-card border-r border-border">
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-bold text-foreground">FinanceFlow</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
