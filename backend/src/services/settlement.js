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

    // Fetch already-settled transactions
    const settledTransactions = await prisma.settlement.findMany({
        where: { tripId },
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

    // Subtract already-settled amounts from ledger
    for (const settled of settledTransactions) {
        ledger[settled.fromUserId] += settled.amount  // Debtor paid, so their debt decreases
        ledger[settled.toUserId] -= settled.amount    // Creditor received, so what they're owed decreases
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

export async function settleTransaction(tripId, fromUserId, toUserId, amount, settledBy) {
    // Verify users are trip members
    const fromMember = await prisma.tripMember.findUnique({
        where: { tripId_userId: { tripId, userId: fromUserId } }
    })
    const toMember = await prisma.tripMember.findUnique({
        where: { tripId_userId: { tripId, userId: toUserId } }
    })

    if (!fromMember || !toMember) {
        throw new Error("Both users must be members of the trip")
    }

    if (fromUserId === toUserId) {
        throw new Error("Cannot settle transaction with yourself")
    }

    if (amount <= 0) {
        throw new Error("Settlement amount must be positive")
    }

    // Create settlement record
    const settlement = await prisma.settlement.create({
        data: {
            tripId,
            fromUserId,
            toUserId,
            amount,
            settledBy,
        },
        include: {
            fromUser: true,
            toUser: true,
        },
    })

    return settlement
}
