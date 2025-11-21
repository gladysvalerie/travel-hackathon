import prisma from "../config/prismaClient.js"

export async function computeSettlement(tripId) {
    // Fetch expenses with splits
    const expenses = await prisma.expense.findMany({
        where: { tripId },
        include: {
            payer: true,
            splits: { include: { user: true } },
        },
    })

    // ledger: { userId: balance }
    const ledger = {}

    // Initialize ledger with all trip members
    const members = await prisma.tripMember.findMany({
        where: { tripId },
    })
    members.forEach((m) => (ledger[m.userId] = 0))

    // Compute payments & splits
    for (const expense of expenses) {
        const payer = expense.paidBy
        ledger[payer] += expense.amount

        for (const split of expense.splits) {
            ledger[split.userId] -= split.shareAmount
        }
    }

    // Convert ledger to arrays
    let debtors = []
    let creditors = []

    for (const [userId, balance] of Object.entries(ledger)) {
        if (balance < -0.01) debtors.push({ userId, amount: -balance }) // owes
        else if (balance > 0.01) creditors.push({ userId, amount: balance }) // owed
    }

    // Settlement transactions
    const transactions = []

    let i = 0,
        j = 0

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i]
        const creditor = creditors[j]

        const amount = Math.min(debtor.amount, creditor.amount)

        transactions.push({
            from: debtor.userId,
            to: creditor.userId,
            amount,
        })

        debtor.amount -= amount
        creditor.amount -= amount

        if (debtor.amount < 0.01) i++
        if (creditor.amount < 0.01) j++
    }

    return { ledger, transactions }
}
