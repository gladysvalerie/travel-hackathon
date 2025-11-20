import { computeSettlement } from "../services/settlement.js"

export async function getSettlement(req, res) {
    try {
        const tripId = req.params.tripId
        const result = await computeSettlement(tripId)
        return res.json(result)
    } catch (e) {
        return res.status(400).json({ error: e.message })
    }
}
