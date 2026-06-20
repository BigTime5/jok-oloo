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

export async function generateReminders() {
  try {
    const currentMonth = getCurrentMonth();
    const treasurerName = process.env.TREASURER_NAME || 'Susan';
    const treasurerPhone = process.env.TREASURER_PHONE || '0729207208';
    const amount = process.env.MONTHLY_CONTRIBUTION || '100';

    const members = await prisma.member.findMany({
      include: {
        payments: {
          where: { month: currentMonth, type: 'monthly' },
        },
      },
    });

    const unpaid = members.filter(
      (m) => !m.payments.some((p) => p.paid)
    );
    
    if (unpaid.length === 0) {
      console.log(`✅ No unpaid members found for ${currentMonth}`);
      return;
    }

    console.log(`📅 Generating reminders for ${unpaid.length} members for ${currentMonth}`);
    
    const reminders = unpaid.map((member) => {
      const message = `Hi ${member.name}, your ${currentMonth} contribution of ${amount}/= is due. Please send to ${treasurerName} on ${treasurerPhone}. Reply PAID once done.`;
      const phone = member.phone.startsWith('0')
        ? `254${member.phone.slice(1)}`
        : member.phone;
      const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      return {
        memberId: member.id,
        memberName: member.name,
        phone: member.phone,
        message,
        waLink,
      };
    });

    // Save generated reminders to system config so admin can view them easily
    await prisma.systemConfig.upsert({
      where: { key: `reminders_${currentMonth}` },
      update: { value: JSON.stringify(reminders) },
      create: { key: `reminders_${currentMonth}`, value: JSON.stringify(reminders) },
    });
    
    console.log(`✅ Reminders generated and saved to config.`);
  } catch (error) {
    console.error('Error generating reminders:', error);
  }
}

export function startReminderScheduler() {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    const now = new Date();
    // Only generate reminders on the 28th of the month
    if (now.getDate() === 28) {
      console.log('🕐 Running monthly reminder generator...');
      generateReminders();
    }
  });

  console.log('📅 Reminder scheduler cron job started');
}
