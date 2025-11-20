import { addMemberToTripByUsername } from "../services/tripMember.js";

export async function addMember(req, res) {
    try {
        const tripId = req.params.tripId;
        const { username } = req.body;

        const member = await addMemberToTripByUsername(
            req.user.userId,
            tripId,
            username
        );

        return res.json(member);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}
