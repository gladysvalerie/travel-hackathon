import * as expenseService from "../services/expense.js";

export async function createExpense(req, res) {
  try {
    console.log("Controller - BODY:", JSON.stringify(req.body, null, 2));
    const tripId = req.params.tripId;
    const { name, description, amount, type, splits, members } = req.body;

    // Service signature: createExpense(userId, tripId, description, amount, type, splitsInput, membersSelected)
    // Use description if provided, otherwise use name
    const expenseDescription = description || name || "";

    // Validate required fields
    if (!expenseDescription || expenseDescription.trim() === "") {
      return res.status(400).json({ error: "Description is required" });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    // CRITICAL: Normalize type - ALWAYS default to "equal" if not provided or invalid
    // Handle ALL edge cases: null, undefined, empty string, whitespace, invalid values
    let splitType = "equal"; // ALWAYS start with default

    // Only process if type is actually provided and not empty
    if (type != null && type !== "" && String(type).trim() !== "") {
      const normalized = String(type).trim().toLowerCase();
      // Only accept valid types, otherwise use default
      if (
        normalized === "equal" ||
        normalized === "equal_selected" ||
        normalized === "custom"
      ) {
        splitType = normalized;
      } else {
        // Invalid type provided - use default
        console.warn(
          `Controller - Invalid split type '${type}', defaulting to 'equal'`
        );
        splitType = "equal";
      }
    }

    console.log("Controller - Type processing (FINAL):", {
      received: type,
      finalType: splitType,
      typeOf: typeof type,
      willPassToService: splitType,
    });

    const expense = await expenseService.createExpense(
      req.user.userId,
      tripId,
      expenseDescription, // description parameter
      parseFloat(amount), // amount parameter
      splitType, // type parameter (always a valid string now)
      splits || null, // splitsInput parameter
      members || null // membersSelected parameter
    );

    console.log("Controller - Expense created successfully:", expense.id);
    return res.json(expense);
  } catch (e) {
    console.error("Controller - Error creating expense:", e);
    return res.status(400).json({ error: e.message });
  }
}

export async function getExpenses(req, res) {
  try {
    const tripId = req.params.tripId;

    const expenses = await expenseService.getExpensesForTrip(
      req.user.userId,
      tripId
    );

    return res.json(expenses);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

export async function getExpense(req, res) {
  try {
    const expenseId = req.params.expenseId;

    const expense = await expenseService.getExpenseById(
      req.user.userId,
      expenseId
    );

    return res.json(expense);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

export async function updateExpense(req, res) {
  try {
    const expenseId = req.params.expenseId;
    const { description, amount } = req.body;

    const updated = await expenseService.updateExpense(
      req.user.userId,
      expenseId,
      description,
      amount
    );

    return res.json(updated);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

export async function deleteExpense(req, res) {
  try {
    const expenseId = req.params.expenseId;

    const result = await expenseService.deleteExpense(
      req.user.userId,
      expenseId
    );

    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
