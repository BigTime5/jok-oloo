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
import { requireAdmin } from './middleware/auth.js';
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

// Runtime seed is disabled in production (build step seeds via prisma db seed).
// Non-production requires admin auth to prevent unauthenticated data overwrites.
app.get('/api/seed', requireAdmin, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const members = [
      { name: 'Bonface Ndege', phone: '0713255357', branch: 'Ndege', registrationPaid: true },
      { name: 'Phinidy Otieno', phone: '0757390844', branch: 'Otieno', registrationPaid: true },
      { name: 'James Teddy Otieno', phone: '0114445957', branch: 'Otieno', registrationPaid: true },
      { name: 'Caroline Nyagilo', phone: '0710758600', branch: 'Ndege', registrationPaid: true },
      { name: 'Lilian Orinda', phone: '0715151546', branch: 'Orinda', registrationPaid: true },
      { name: 'Jacinter Orinda', phone: '0746942316', branch: 'Orinda', registrationPaid: true },
      { name: 'Millicent Otieno', phone: '0704924392', branch: 'Otieno', registrationPaid: true },
      { name: 'Cynthia Atieno', phone: '0745524814', branch: 'Atieno', registrationPaid: true },
      { name: 'Jared Ndege', phone: '0725924482', branch: 'Ndege', registrationPaid: true },
      { name: 'Mary Adhiambo', phone: '0723978383', branch: 'Orinda', registrationPaid: true },
      { name: 'Susan Atieno', phone: '0729207208', branch: 'Orinda', registrationPaid: true },
      { name: 'Molline Akoth', phone: '0746648391', branch: 'Akoth', registrationPaid: true },
      { name: 'Rosemary Ndege', phone: '0710712409', branch: 'Ndege', registrationPaid: true },
      { name: 'George Odhiambo Orinda', phone: '0728686475', branch: 'Orinda', registrationPaid: false },
      { name: 'Kenneth Orinda', phone: '0727608881', branch: 'Orinda', registrationPaid: true },
      { name: 'Felix Ochieng', phone: '0707782600', branch: 'Ndege', registrationPaid: true },
      { name: 'Jane Obondo', phone: '0723642769', branch: 'Obondo', registrationPaid: true },
      { name: 'Beryl Achieng Obondo', phone: '0745356175', branch: 'Obondo', registrationPaid: true },
      { name: 'Jackline Ndege', phone: '0792254403', branch: 'Ndege', registrationPaid: true },
      { name: 'Benter Ndege', phone: '0757157867', branch: 'Ndege', registrationPaid: true },
      { name: 'Joshua Ndege', phone: '0792298429', branch: 'Ndege', registrationPaid: true },
      { name: 'Hellen Beatrice', phone: '0702228028', branch: 'Other', registrationPaid: false },
      { name: 'Marquline Aoko Odhiambo', phone: '0723742073', branch: 'Odhiambo', registrationPaid: false },
      { name: 'Selina Orinda', phone: '0112408989', branch: 'Orinda', registrationPaid: true },
      { name: 'Joseph Obondo', phone: '0723649544', branch: 'Obondo', registrationPaid: true },
      { name: 'Steve Obondo', phone: '0742310555', branch: 'Obondo', registrationPaid: false },
      { name: 'Richard Obondo', phone: '0717815658', branch: 'Obondo', registrationPaid: false },
      { name: 'Brian Oluoch', phone: '0707018910', branch: 'Oluoch', registrationPaid: true },
      { name: 'Francis Ndege', phone: '0706928657', branch: 'Ndege', registrationPaid: true },
      { name: 'Erick Nyagilo', phone: '', branch: 'Nyagilo', registrationPaid: false },
      { name: 'George Nyagilo', phone: '', branch: 'Nyagilo', registrationPaid: false },
      { name: 'Walter Aduowo (Doki)', phone: '', branch: 'Aduowo', registrationPaid: true }
    ];
    let count = 0;
    for (let i = 0; i < members.length; i++) {
      await prisma.member.upsert({
        where: { id: i + 1 },
        update: members[i],
        create: { ...members[i], id: i + 1 },
      });
      count++;
    }

    await prisma.$executeRaw`
      SELECT setval(
        pg_get_serial_sequence('"Member"', 'id'),
        COALESCE((SELECT MAX("id") FROM "Member"), 1),
        true
      )
    `;

    res.json({ status: 'success', message: `Seeded ${count} members successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

// Start Cron Jobs
startMonthUpdater();
startReminderScheduler();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
