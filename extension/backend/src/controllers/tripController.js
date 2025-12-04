import * as tripService from "../services/trip.js";

export async function createTrip(req, res) {
    try {
        const { name } = req.body;
        const trip = await tripService.createTrip(req.user.userId, name);
        return res.json(trip);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

export async function getMyTrips(req, res) {
    try {
        const trips = await tripService.getTripsForUser(req.user.userId);
        return res.json(trips);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

export async function getTrip(req, res) {
    try {
        const userId = req.user.userId;
        const tripId = req.params.tripId;
        console.log(tripId);
        const trip = await tripService.getTripById(userId, tripId);
        return res.json(trip);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

export async function updateTrip(req, res) {
    try {
        const userId = req.user.userId;
        const tripId = req.params.tripId;
        const { name } = req.body;

        const updated = await tripService.updateTrip(userId, tripId, name);
        return res.json(updated);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}

export async function deleteTrip(req, res) {
    try {
        const userId = req.user.userId;
        const tripId = req.params.tripId;
        const deleted = await tripService.deleteTrip(userId, tripId);
        return res.json(deleted);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
}
