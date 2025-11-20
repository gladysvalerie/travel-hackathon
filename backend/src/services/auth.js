import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/prismaClient.js'

export async function register(name, email, password) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new Error("Email already registered")

    const hash = bcrypt.hashSync(password, 8)

    const user = await prisma.user.create({
        data: {
            name,
            email,
            passwordHash: hash
        }
    })

    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    return { user, token }
}

export async function login(email, password) {
    const user = await prisma.user.findUnique({ where: {email} })
    if (!user) throw new Error("Invalid credentials")

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) throw new Error("Invalid credentials")
        console.log("JWT_SECRET at runtime:", process.env.JWT_SECRET);

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        )
    
        return { user, token }
}