import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getCurrentMonth(): string {
  const now = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

function getMonthsBetween(start: string, end: string): string[] {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [startMonth, startYear] = start.split(' ');
  const [endMonth, endYear] = end.split(' ');

  const startIdx = months.indexOf(startMonth);
  const endIdx = months.indexOf(endMonth);
  const sYear = parseInt(startYear);
  const eYear = parseInt(endYear);

  const result: string[] = [];
  let year = sYear;
  let idx = startIdx;

  while (year < eYear || (year === eYear && idx <= endIdx)) {
    result.push(`${months[idx]} ${year}`);
    idx++;
    if (idx >= 12) {
      idx = 0;
      year++;
    }
  }

  return result;
}

export async function updateMonthlyPayments() {
  try {
    const groupStart = process.env.GROUP_START_MONTH || 'May 2026';
    const currentMonth = getCurrentMonth();
    const monthsToTrack = getMonthsBetween(groupStart, currentMonth);
    const amount = parseInt(process.env.MONTHLY_CONTRIBUTION || '100');

    const members = await prisma.member.findMany();

    for (const member of members) {
      for (const month of monthsToTrack) {
        await prisma.payment.upsert({
          where: {
            memberId_month_type: {
              memberId: member.id,
              month,
              type: 'monthly',
            },
          },
          update: {}, // do nothing if it exists, preserving existing data
          create: {
            memberId: member.id,
            month,
            type: 'monthly',
            amount,
            paid: false,
          },
        });
      }
    }

    console.log(`✅ Monthly payments updated for ${monthsToTrack.length} months, ${members.length} members`);

    // Update system config
    await prisma.systemConfig.upsert({
      where: { key: 'currentMonth' },
      update: { value: currentMonth },
      create: { key: 'currentMonth', value: currentMonth },
    });

    await prisma.systemConfig.upsert({
      where: { key: 'lastMonthUpdate' },
      update: { value: new Date().toISOString() },
      create: { key: 'lastMonthUpdate', value: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Error updating monthly payments:', error);
  }
}

export function startMonthUpdater() {
  // Run immediately on startup
  updateMonthlyPayments();

  // Run daily at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('🕐 Running monthly payment updater...');
    updateMonthlyPayments();
  });

  console.log('📅 Month updater cron job started');
}
