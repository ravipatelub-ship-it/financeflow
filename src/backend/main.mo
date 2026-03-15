import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type Account = {
    id : Nat;
    name : Text;
    accountType : Text;
    balance : Float;
    notes : Text;
  };

  type Transaction = {
    id : Nat;
    transactionType : Text;
    amount : Float;
    date : Int;
    categoryId : Nat;
    source : Text;
    accountId : Nat;
    notes : Text;
  };

  type Category = {
    id : Nat;
    name : Text;
    color : Text;
    isDefault : Bool;
  };

  type Debt = {
    id : Nat;
    name : Text;
    lender : Text;
    totalAmount : Float;
    interestRate : Float;
    emiAmount : Float;
    dueDate : Int;
    remainingBalance : Float;
    startDate : Int;
    notes : Text;
  };

  type Goal = {
    id : Nat;
    name : Text;
    targetAmount : Float;
    currentAmount : Float;
    deadline : Int;
    monthlyContribution : Float;
    notes : Text;
  };

  type Investment = {
    id : Nat;
    name : Text;
    investmentType : Text;
    amountInvested : Float;
    currentValue : Float;
    date : Int;
    notes : Text;
  };

  type Budget = {
    id : Nat;
    categoryId : Nat;
    month : Text;
    limitAmount : Float;
    spentAmount : Float;
  };

  type MonthlySummary = {
    totalIncome : Float;
    totalExpenses : Float;
    savings : Float;
  };

  type CategorySpending = {
    categoryId : Nat;
    totalSpent : Float;
  };

  type PortfolioSummary = {
    totalInvested : Float;
    totalCurrentValue : Float;
    totalProfitLoss : Float;
  };

  public type UserProfile = {
    name : Text;
  };

  // Initialize the access control state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var nextId = 0;

  func generateId() : Nat {
    let currentId = nextId;
    nextId += 1;
    currentId;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let accounts = Map.empty<Principal, Map.Map<Nat, Account>>();
  let transactions = Map.empty<Principal, Map.Map<Nat, Transaction>>();
  let categories = Map.empty<Principal, Map.Map<Nat, Category>>();
  let debts = Map.empty<Principal, Map.Map<Nat, Debt>>();
  let goals = Map.empty<Principal, Map.Map<Nat, Goal>>();
  let investments = Map.empty<Principal, Map.Map<Nat, Investment>>();
  let budgets = Map.empty<Principal, Map.Map<Nat, Budget>>();

  func getUserMap<K, V>(data : Map.Map<Principal, Map.Map<K, V>>, caller : Principal) : Map.Map<K, V> {
    switch (data.get(caller)) {
      case (null) {
        let newMap = Map.empty<K, V>();
        data.add(caller, newMap);
        newMap;
      };
      case (?map) { map };
    };
  };

  // Helper: apply a delta to an account balance
  func adjustAccountBalance(userAccounts : Map.Map<Nat, Account>, accountId : Nat, delta : Float) {
    switch (userAccounts.get(accountId)) {
      case (null) {};
      case (?acc) {
        let updated : Account = {
          id = acc.id;
          name = acc.name;
          accountType = acc.accountType;
          balance = acc.balance + delta;
          notes = acc.notes;
        };
        userAccounts.add(accountId, updated);
      };
    };
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Account CRUD
  public shared ({ caller }) func createAccount(name : Text, accountType : Text, balance : Float, notes : Text) : async Account {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create accounts");
    };

    let newAccount : Account = {
      id = generateId();
      name;
      accountType;
      balance;
      notes;
    };

    let userAccounts = getUserMap(accounts, caller);
    userAccounts.add(newAccount.id, newAccount);
    newAccount;
  };

  public query ({ caller }) func getAllAccounts() : async [Account] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view accounts");
    };

    switch (accounts.get(caller)) {
      case (null) { [] };
      case (?userAccounts) { userAccounts.values().toArray() };
    };
  };

  public shared ({ caller }) func updateAccount(id : Nat, name : Text, accountType : Text, balance : Float, notes : Text) : async Account {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update accounts");
    };

    let userAccounts = getUserMap(accounts, caller);
    let account = switch (userAccounts.get(id)) {
      case (null) { Runtime.trap("Account not found") };
      case (?existing) { existing };
    };

    let updatedAccount : Account = {
      id;
      name;
      accountType;
      balance;
      notes;
    };

    userAccounts.add(id, updatedAccount);
    updatedAccount;
  };

  public shared ({ caller }) func deleteAccount(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete accounts");
    };

    let userAccounts = getUserMap(accounts, caller);
    if (not userAccounts.containsKey(id)) {
      Runtime.trap("Account not found");
    };
    userAccounts.remove(id);
  };

  // Transaction CRUD
  // When a transaction is created, the linked account balance is updated:
  //   income  -> +amount
  //   expense -> -amount
  public shared ({ caller }) func createTransaction(transactionType : Text, amount : Float, date : Int, categoryId : Nat, source : Text, accountId : Nat, notes : Text) : async Transaction {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create transactions");
    };

    let newTransaction : Transaction = {
      id = generateId();
      transactionType;
      amount;
      date;
      categoryId;
      source;
      accountId;
      notes;
    };

    let userTransactions = getUserMap(transactions, caller);
    userTransactions.add(newTransaction.id, newTransaction);

    // Update account balance
    let userAccounts = getUserMap(accounts, caller);
    let delta = if (transactionType == "income") { amount } else { -amount };
    adjustAccountBalance(userAccounts, accountId, delta);

    newTransaction;
  };

  public query ({ caller }) func getAllTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transactions");
    };

    switch (transactions.get(caller)) {
      case (null) { [] };
      case (?userTransactions) { userTransactions.values().toArray() };
    };
  };

  // When updating, reverse the old transaction effect then apply the new one
  public shared ({ caller }) func updateTransaction(id : Nat, transactionType : Text, amount : Float, date : Int, categoryId : Nat, source : Text, accountId : Nat, notes : Text) : async Transaction {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update transactions");
    };

    let userTransactions = getUserMap(transactions, caller);
    let old = switch (userTransactions.get(id)) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?existing) { existing };
    };

    let updatedTransaction : Transaction = {
      id;
      transactionType;
      amount;
      date;
      categoryId;
      source;
      accountId;
      notes;
    };

    userTransactions.add(id, updatedTransaction);

    // Reverse old effect
    let userAccounts = getUserMap(accounts, caller);
    let oldDelta = if (old.transactionType == "income") { -old.amount } else { old.amount };
    adjustAccountBalance(userAccounts, old.accountId, oldDelta);

    // Apply new effect
    let newDelta = if (transactionType == "income") { amount } else { -amount };
    adjustAccountBalance(userAccounts, accountId, newDelta);

    updatedTransaction;
  };

  // When deleting, reverse the transaction effect on the account
  public shared ({ caller }) func deleteTransaction(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete transactions");
    };

    let userTransactions = getUserMap(transactions, caller);
    let tx = switch (userTransactions.get(id)) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?existing) { existing };
    };

    userTransactions.remove(id);

    // Reverse the effect on account balance
    let userAccounts = getUserMap(accounts, caller);
    let delta = if (tx.transactionType == "income") { -tx.amount } else { tx.amount };
    adjustAccountBalance(userAccounts, tx.accountId, delta);
  };

  // Category CRUD
  public shared ({ caller }) func createCategory(name : Text, color : Text, isDefault : Bool) : async Category {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create categories");
    };

    let newCategory : Category = {
      id = generateId();
      name;
      color;
      isDefault;
    };

    let userCategories = getUserMap(categories, caller);
    userCategories.add(newCategory.id, newCategory);
    newCategory;
  };

  public query ({ caller }) func getAllCategories() : async [Category] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view categories");
    };

    switch (categories.get(caller)) {
      case (null) { [] };
      case (?userCategories) { userCategories.values().toArray() };
    };
  };

  public shared ({ caller }) func updateCategory(id : Nat, name : Text, color : Text, isDefault : Bool) : async Category {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update categories");
    };

    let userCategories = getUserMap(categories, caller);
    let category = switch (userCategories.get(id)) {
      case (null) { Runtime.trap("Category not found") };
      case (?existing) { existing };
    };

    let updatedCategory : Category = {
      id;
      name;
      color;
      isDefault;
    };

    userCategories.add(id, updatedCategory);
    updatedCategory;
  };

  public shared ({ caller }) func deleteCategory(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete categories");
    };

    let userCategories = getUserMap(categories, caller);
    if (not userCategories.containsKey(id)) {
      Runtime.trap("Category not found");
    };
    userCategories.remove(id);
  };

  // Debt CRUD
  public shared ({ caller }) func createDebt(name : Text, lender : Text, totalAmount : Float, interestRate : Float, emiAmount : Float, dueDate : Int, remainingBalance : Float, startDate : Int, notes : Text) : async Debt {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create debts");
    };

    let newDebt : Debt = {
      id = generateId();
      name;
      lender;
      totalAmount;
      interestRate;
      emiAmount;
      dueDate;
      remainingBalance;
      startDate;
      notes;
    };

    let userDebts = getUserMap(debts, caller);
    userDebts.add(newDebt.id, newDebt);
    newDebt;
  };

  public query ({ caller }) func getAllDebts() : async [Debt] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view debts");
    };

    switch (debts.get(caller)) {
      case (null) { [] };
      case (?userDebts) { userDebts.values().toArray() };
    };
  };

  public shared ({ caller }) func updateDebt(id : Nat, name : Text, lender : Text, totalAmount : Float, interestRate : Float, emiAmount : Float, dueDate : Int, remainingBalance : Float, startDate : Int, notes : Text) : async Debt {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update debts");
    };

    let userDebts = getUserMap(debts, caller);
    let debt = switch (userDebts.get(id)) {
      case (null) { Runtime.trap("Debt not found") };
      case (?existing) { existing };
    };

    let updatedDebt : Debt = {
      id;
      name;
      lender;
      totalAmount;
      interestRate;
      emiAmount;
      dueDate;
      remainingBalance;
      startDate;
      notes;
    };

    userDebts.add(id, updatedDebt);
    updatedDebt;
  };

  public shared ({ caller }) func deleteDebt(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete debts");
    };

    let userDebts = getUserMap(debts, caller);
    if (not userDebts.containsKey(id)) {
      Runtime.trap("Debt not found");
    };
    userDebts.remove(id);
  };

  // Goal CRUD
  public shared ({ caller }) func createGoal(name : Text, targetAmount : Float, currentAmount : Float, deadline : Int, monthlyContribution : Float, notes : Text) : async Goal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create goals");
    };

    let newGoal : Goal = {
      id = generateId();
      name;
      targetAmount;
      currentAmount;
      deadline;
      monthlyContribution;
      notes;
    };

    let userGoals = getUserMap(goals, caller);
    userGoals.add(newGoal.id, newGoal);
    newGoal;
  };

  public query ({ caller }) func getAllGoals() : async [Goal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view goals");
    };

    switch (goals.get(caller)) {
      case (null) { [] };
      case (?userGoals) { userGoals.values().toArray() };
    };
  };

  public shared ({ caller }) func updateGoal(id : Nat, name : Text, targetAmount : Float, currentAmount : Float, deadline : Int, monthlyContribution : Float, notes : Text) : async Goal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update goals");
    };

    let userGoals = getUserMap(goals, caller);
    let goal = switch (userGoals.get(id)) {
      case (null) { Runtime.trap("Goal not found") };
      case (?existing) { existing };
    };

    let updatedGoal : Goal = {
      id;
      name;
      targetAmount;
      currentAmount;
      deadline;
      monthlyContribution;
      notes;
    };

    userGoals.add(id, updatedGoal);
    updatedGoal;
  };

  public shared ({ caller }) func deleteGoal(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete goals");
    };

    let userGoals = getUserMap(goals, caller);
    if (not userGoals.containsKey(id)) {
      Runtime.trap("Goal not found");
    };
    userGoals.remove(id);
  };

  // Investment CRUD
  public shared ({ caller }) func createInvestment(name : Text, investmentType : Text, amountInvested : Float, currentValue : Float, date : Int, notes : Text) : async Investment {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create investments");
    };

    let newInvestment : Investment = {
      id = generateId();
      name;
      investmentType;
      amountInvested;
      currentValue;
      date;
      notes;
    };

    let userInvestments = getUserMap(investments, caller);
    userInvestments.add(newInvestment.id, newInvestment);
    newInvestment;
  };

  public query ({ caller }) func getAllInvestments() : async [Investment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view investments");
    };

    switch (investments.get(caller)) {
      case (null) { [] };
      case (?userInvestments) { userInvestments.values().toArray() };
    };
  };

  public shared ({ caller }) func updateInvestment(id : Nat, name : Text, investmentType : Text, amountInvested : Float, currentValue : Float, date : Int, notes : Text) : async Investment {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update investments");
    };

    let userInvestments = getUserMap(investments, caller);
    let investment = switch (userInvestments.get(id)) {
      case (null) { Runtime.trap("Investment not found") };
      case (?existing) { existing };
    };

    let updatedInvestment : Investment = {
      id;
      name;
      investmentType;
      amountInvested;
      currentValue;
      date;
      notes;
    };

    userInvestments.add(id, updatedInvestment);
    updatedInvestment;
  };

  public shared ({ caller }) func deleteInvestment(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete investments");
    };

    let userInvestments = getUserMap(investments, caller);
    if (not userInvestments.containsKey(id)) {
      Runtime.trap("Investment not found");
    };
    userInvestments.remove(id);
  };

  // Budget CRUD
  public shared ({ caller }) func createBudget(categoryId : Nat, month : Text, limitAmount : Float, spentAmount : Float) : async Budget {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create budgets");
    };

    let newBudget : Budget = {
      id = generateId();
      categoryId;
      month;
      limitAmount;
      spentAmount;
    };

    let userBudgets = getUserMap(budgets, caller);
    userBudgets.add(newBudget.id, newBudget);
    newBudget;
  };

  public query ({ caller }) func getAllBudgets() : async [Budget] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view budgets");
    };

    switch (budgets.get(caller)) {
      case (null) { [] };
      case (?userBudgets) { userBudgets.values().toArray() };
    };
  };

  public shared ({ caller }) func updateBudget(id : Nat, categoryId : Nat, month : Text, limitAmount : Float, spentAmount : Float) : async Budget {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update budgets");
    };

    let userBudgets = getUserMap(budgets, caller);
    let budget = switch (userBudgets.get(id)) {
      case (null) { Runtime.trap("Budget not found") };
      case (?existing) { existing };
    };

    let updatedBudget : Budget = {
      id;
      categoryId;
      month;
      limitAmount;
      spentAmount;
    };

    userBudgets.add(id, updatedBudget);
    updatedBudget;
  };

  public shared ({ caller }) func deleteBudget(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete budgets");
    };

    let userBudgets = getUserMap(budgets, caller);
    if (not userBudgets.containsKey(id)) {
      Runtime.trap("Budget not found");
    };
    userBudgets.remove(id);
  };

  // Additional Queries
  public query ({ caller }) func getTotalBalance() : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view total balance");
    };

    switch (accounts.get(caller)) {
      case (null) { 0.0 };
      case (?userAccounts) {
        let balances = userAccounts.values().toArray().map(func(a) { a.balance });
        balances.values().foldLeft(0.0, Float.add);
      };
    };
  };

  public query ({ caller }) func getMonthlySummary(month : Text) : async MonthlySummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view monthly summary");
    };

    switch (transactions.get(caller)) {
      case (null) {
        {
          totalIncome = 0.0;
          totalExpenses = 0.0;
          savings = 0.0;
        };
      };
      case (?userTransactions) {
        var totalIncome : Float = 0.0;
        var totalExpenses : Float = 0.0;

        for (transaction in userTransactions.values()) {
          let transactionMonth = getMonthFromTimestamp(transaction.date);
          if (transactionMonth == month) {
            if (transaction.transactionType == "income") {
              totalIncome += transaction.amount;
            } else if (transaction.transactionType == "expense") {
              totalExpenses += transaction.amount;
            };
          };
        };

        {
          totalIncome;
          totalExpenses;
          savings = totalIncome - totalExpenses;
        };
      };
    };
  };

  public query ({ caller }) func getCategorySpending(month : Text) : async [CategorySpending] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view category spending");
    };

    switch (transactions.get(caller)) {
      case (null) { [] };
      case (?userTransactions) {
        let categoryMap = Map.empty<Nat, Float>();

        for (transaction in userTransactions.values()) {
          let transactionMonth = getMonthFromTimestamp(transaction.date);
          if (transactionMonth == month and transaction.transactionType == "expense") {
            let currentTotal = switch (categoryMap.get(transaction.categoryId)) {
              case (null) { 0.0 };
              case (?total) { total };
            };
            categoryMap.add(transaction.categoryId, currentTotal + transaction.amount);
          };
        };

        categoryMap.entries().toArray().map(
          func((categoryId, totalSpent)) {
            { categoryId; totalSpent };
          }
        );
      };
    };
  };

  public query ({ caller }) func getPortfolioSummary() : async PortfolioSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view portfolio summary");
    };

    switch (investments.get(caller)) {
      case (null) {
        {
          totalInvested = 0.0;
          totalCurrentValue = 0.0;
          totalProfitLoss = 0.0;
        };
      };
      case (?userInvestments) {
        let investedValues = userInvestments.values().toArray().map(func(i) { i.amountInvested });
        let invested = investedValues.values().foldLeft(0.0, Float.add);

        let currentValues = userInvestments.values().toArray().map(func(i) { i.currentValue });
        let current = currentValues.values().foldLeft(0.0, Float.add);

        {
          totalInvested = invested;
          totalCurrentValue = current;
          totalProfitLoss = current - invested;
        };
      };
    };
  };

  public shared ({ caller }) func transferBetweenAccounts(fromId : Nat, toId : Nat, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can transfer between accounts");
    };

    let userAccounts = getUserMap(accounts, caller);

    let fromAccount = switch (userAccounts.get(fromId)) {
      case (null) { Runtime.trap("Source account not found") };
      case (?account) { account };
    };

    let toAccount = switch (userAccounts.get(toId)) {
      case (null) { Runtime.trap("Destination account not found") };
      case (?account) { account };
    };

    if (fromAccount.balance < amount) {
      Runtime.trap("Insufficient balance in source account");
    };

    let updatedFromAccount : Account = {
      id = fromAccount.id;
      name = fromAccount.name;
      accountType = fromAccount.accountType;
      balance = fromAccount.balance - amount;
      notes = fromAccount.notes;
    };

    let updatedToAccount : Account = {
      id = toAccount.id;
      name = toAccount.name;
      accountType = toAccount.accountType;
      balance = toAccount.balance + amount;
      notes = toAccount.notes;
    };

    userAccounts.add(fromId, updatedFromAccount);
    userAccounts.add(toId, updatedToAccount);
  };

  public shared ({ caller }) func recordDebtPayment(debtId : Nat, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record debt payments");
    };

    let userDebts = getUserMap(debts, caller);

    let debt = switch (userDebts.get(debtId)) {
      case (null) { Runtime.trap("Debt not found") };
      case (?d) { d };
    };

    if (amount > debt.remainingBalance) {
      Runtime.trap("Payment amount exceeds remaining balance");
    };

    let updatedDebt : Debt = {
      id = debt.id;
      name = debt.name;
      lender = debt.lender;
      totalAmount = debt.totalAmount;
      interestRate = debt.interestRate;
      emiAmount = debt.emiAmount;
      dueDate = debt.dueDate;
      remainingBalance = debt.remainingBalance - amount;
      startDate = debt.startDate;
      notes = debt.notes;
    };

    userDebts.add(debtId, updatedDebt);
  };

  public shared ({ caller }) func contributeToGoal(goalId : Nat, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can contribute to goals");
    };

    let userGoals = getUserMap(goals, caller);

    let goal = switch (userGoals.get(goalId)) {
      case (null) { Runtime.trap("Goal not found") };
      case (?g) { g };
    };

    let updatedGoal : Goal = {
      id = goal.id;
      name = goal.name;
      targetAmount = goal.targetAmount;
      currentAmount = goal.currentAmount + amount;
      deadline = goal.deadline;
      monthlyContribution = goal.monthlyContribution;
      notes = goal.notes;
    };

    userGoals.add(goalId, updatedGoal);
  };

  // Helper function to extract month from timestamp
  // Helper: timestamp is milliseconds since Unix epoch
  func isLeapYear(y : Int) : Bool {
    (y % 4 == 0 and y % 100 != 0) or (y % 400 == 0)
  };

  func getMonthFromTimestamp(timestamp : Int) : Text {
    let totalSeconds = timestamp / 1_000;
    let totalDays = totalSeconds / 86400;
    var year = 1970;
    var days = totalDays;
    label yearLoop loop {
      let daysInYear = if (isLeapYear(year)) 366 else 365;
      if (days < daysInYear) break yearLoop;
      days -= daysInYear;
      year += 1;
    };
    let leap = isLeapYear(year);
    let monthDays = [31, if (leap) 29 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var month = 0;
    var d = days;
    label monthLoop for (dm in monthDays.vals()) {
      if (d < dm) break monthLoop;
      d -= dm;
      month += 1;
    };
    month += 1;
    year.toText() # "-" # (if (month < 10) { "0" } else { "" }) # month.toText();
  };
};
