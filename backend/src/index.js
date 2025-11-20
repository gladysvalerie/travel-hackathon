import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import tripRoutes from './routes/trip.js'
import tripMemberRoutes from './routes/tripMember.js'
import expenseRoutes from './routes/expense.js'
import settlementRoutes from './routes/settlement.js'

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.sendStatus(201)
})

app.use('/auth', authRoutes)
app.use('/user', userRoutes)
app.use('/trip', tripRoutes)
app.use('/tripmember', tripMemberRoutes)
app.use('/expense', expenseRoutes)
app.use('/settlement', settlementRoutes)

app.listen(PORT, () => {
    console.log(`Running server in port: ${PORT}`)
})