import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth.js';
import { membersRouter } from './routes/members.js';
import { paymentsRouter } from './routes/payments.js';
import { remindersRouter } from './routes/reminders.js';
import { startMonthUpdater } from './cron/monthUpdater.js';
import { startReminderScheduler } from './cron/reminderScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/members', membersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reminders', remindersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Cron Jobs
startMonthUpdater();
startReminderScheduler();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
