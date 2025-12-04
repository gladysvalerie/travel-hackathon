import dotenv from "dotenv";
dotenv.config();

import * as userService from "../services/user.js"

export async function getUser(req, res) {
    try {
        const user = await userService.getUser(req.user.userId)
        
        if(!user) {
            return res.status(400).json({error: "User not found"})
        }

        return res.json(user)
    } catch(e) {
        return res.status(400).json({ error: e.message })
    }
}