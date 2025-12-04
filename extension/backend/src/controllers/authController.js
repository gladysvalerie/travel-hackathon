import * as authService from "../services/auth.js"

export async function register(req, res) {
    try {
        const { username, name, email, password } = req.body
        const result = await authService.register(username, name, email, password)
        return res.json(result)
    } catch (e) {
        return res.status(400).json({ error: e.message })
    }
}

export async function login(req, res) {
    try {
        const { identifier, password } = req.body
        const result = await authService.login(identifier, password)
        return res.json(result)
    } catch (e) {
        return res.status(400).json({ error: e.message })
    }
}