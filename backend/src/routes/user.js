import express from 'express'
import { getUser } from "../controllers/userController.js"
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

router.get('/me', authMiddleware, getUser)

export default router