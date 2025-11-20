import * as authService from "../services/auth.js"

export async function register(req, res) {
    try {
        const { name, email, password } = req.body
        const result = await authService.register(name, email, password)
        return res.json(result)
    } catch (e) {
        return res.status(400).json({ error: e.message })
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body
        const result = await authService.login(email, password)
        return res.json(result)
    } catch (e) {
        return res.status(400).json({ error: e.message })
    }
}