import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
dotenv.config()

const jwt_key = process.env.JWT_SECRET

export function authMiddleware(req, res, next) {
    const header = req.headers.authorization

    if(!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid Authorization header" })
    }

    const token = header.split(" ")[1]

    try {
        const decoded = jwt.verify(token, jwt_key)

        req.userId = decoded.userId
        return next()
    } catch (e) {
        return res.status(401).json({ error: "Invalid or expired token" })
    }
}