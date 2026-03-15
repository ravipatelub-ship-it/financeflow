import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Transaction {
    id: bigint;
    categoryId: bigint;
    transactionType: string;
    accountId: bigint;
    source: string;
    date: bigint;
    notes: string;
    amount: number;
}
export interface Debt {
    id: bigint;
    name: string;
    dueDate: bigint;
    interestRate: number;
    remainingBalance: number;
    totalAmount: number;
    lender: string;
    notes: string;
    emiAmount: number;
    startDate: bigint;
}
export interface Category {
    id: bigint;
    name: string;
    color: string;
    isDefault: boolean;
}
export interface Budget {
    id: bigint;
    categoryId: bigint;
    month: string;
    limitAmount: number;
    spentAmount: number;
}
export interface Account {
    id: bigint;
    balance: number;
    name: string;
    accountType: string;
    notes: string;
}
export interface PortfolioSummary {
    totalProfitLoss: number;
    totalInvested: number;
    totalCurrentValue: number;
}
export interface CategorySpending {
    categoryId: bigint;
    totalSpent: number;
}
export interface Investment {
    id: bigint;
    date: bigint;
    name: string;
    currentValue: number;
    notes: string;
    investmentType: string;
    amountInvested: number;
}
export interface MonthlySummary {
    totalIncome: number;
    totalExpenses: number;
    savings: number;
}
export interface UserProfile {
    name: string;
}
export interface Goal {
    id: bigint;
    name: string;
    deadline: bigint;
    targetAmount: number;
    notes: string;
    currentAmount: number;
    monthlyContribution: number;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    contributeToGoal(goalId: bigint, amount: number): Promise<void>;
    createAccount(name: string, accountType: string, balance: number, notes: string): Promise<Account>;
    createBudget(categoryId: bigint, month: string, limitAmount: number, spentAmount: number): Promise<Budget>;
    createCategory(name: string, color: string, isDefault: boolean): Promise<Category>;
    createDebt(name: string, lender: string, totalAmount: number, interestRate: number, emiAmount: number, dueDate: bigint, remainingBalance: number, startDate: bigint, notes: string): Promise<Debt>;
    createGoal(name: string, targetAmount: number, currentAmount: number, deadline: bigint, monthlyContribution: number, notes: string): Promise<Goal>;
    createInvestment(name: string, investmentType: string, amountInvested: number, currentValue: number, date: bigint, notes: string): Promise<Investment>;
    createTransaction(transactionType: string, amount: number, date: bigint, categoryId: bigint, source: string, accountId: bigint, notes: string): Promise<Transaction>;
    deleteAccount(id: bigint): Promise<void>;
    deleteBudget(id: bigint): Promise<void>;
    deleteCategory(id: bigint): Promise<void>;
    deleteDebt(id: bigint): Promise<void>;
    deleteGoal(id: bigint): Promise<void>;
    deleteInvestment(id: bigint): Promise<void>;
    deleteTransaction(id: bigint): Promise<void>;
    getAllAccounts(): Promise<Array<Account>>;
    getAllBudgets(): Promise<Array<Budget>>;
    getAllCategories(): Promise<Array<Category>>;
    getAllDebts(): Promise<Array<Debt>>;
    getAllGoals(): Promise<Array<Goal>>;
    getAllInvestments(): Promise<Array<Investment>>;
    getAllTransactions(): Promise<Array<Transaction>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCategorySpending(month: string): Promise<Array<CategorySpending>>;
    getMonthlySummary(month: string): Promise<MonthlySummary>;
    getPortfolioSummary(): Promise<PortfolioSummary>;
    getTotalBalance(): Promise<number>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    recordDebtPayment(debtId: bigint, amount: number): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    transferBetweenAccounts(fromId: bigint, toId: bigint, amount: number): Promise<void>;
    updateAccount(id: bigint, name: string, accountType: string, balance: number, notes: string): Promise<Account>;
    updateBudget(id: bigint, categoryId: bigint, month: string, limitAmount: number, spentAmount: number): Promise<Budget>;
    updateCategory(id: bigint, name: string, color: string, isDefault: boolean): Promise<Category>;
    updateDebt(id: bigint, name: string, lender: string, totalAmount: number, interestRate: number, emiAmount: number, dueDate: bigint, remainingBalance: number, startDate: bigint, notes: string): Promise<Debt>;
    updateGoal(id: bigint, name: string, targetAmount: number, currentAmount: number, deadline: bigint, monthlyContribution: number, notes: string): Promise<Goal>;
    updateInvestment(id: bigint, name: string, investmentType: string, amountInvested: number, currentValue: number, date: bigint, notes: string): Promise<Investment>;
    updateTransaction(id: bigint, transactionType: string, amount: number, date: bigint, categoryId: bigint, source: string, accountId: bigint, notes: string): Promise<Transaction>;
}
