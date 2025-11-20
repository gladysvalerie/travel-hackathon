import bcrypt from 'bcryptjs'
import prisma from '../config/prismaClient.js'

export async function getUser(userId) {
    const user = await prisma.user.findUnique({
        where: {id: userId},
        include: {
            tripsCreated: true,
            tripMembers: {
                include: {
                    trip: true
                }
            },
            expensesPaid: true,
            expenseSplits: {
                include: {
                    expense: true
                }
            }
        }
    })

    if(!user) {
        throw new Error("Invalid email or password")
    }

    return user
}