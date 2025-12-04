import { computeSettlement, settleTransaction } from "../services/settlement.js"

export async function getSettlement(req, res) {
    try {
        const tripId = req.params.tripId
        const result = await computeSettlement(tripId)
        return res.json(result)
    } catch (e) {
        return res.status(400).json({ error: e.message })
    }
}

export async function settleTransactionHandler(req, res) {
    try {
        const tripId = req.params.tripId
        const { fromUserId, toUserId, amount } = req.body
        const userId = req.user.userId

        if (!fromUserId || !toUserId || !amount) {
            return res.status(400).json({ error: "Missing required fields: fromUserId, toUserId, amount" })
        }

        const result = await settleTransaction(tripId, fromUserId, toUserId, amount, userId)
        return res.json(result)
    } catch (e) {
        return res.status(400).json({ error: e.message })
    }
}
