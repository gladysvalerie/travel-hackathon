import * as expenseService from "../services/expense.js";

export async function createExpense(req, res) {
    try {
        console.log("BODY:", req.body); // <--- log here
        console.log("TYPE:", req.body.members);
        const tripId = req.params.tripId;
        const { name, description, amount, type, splits, members } = req.body;

        const expense = await expenseService.createExpense(
            req.user.userId, 
            tripId,
            name,
            description,
            amount,
            type,
            splits,
            members
        );

        return res.json(expense);
    } catch (e) {
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
