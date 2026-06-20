import { PrismaClient } from '@prisma/client';

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
  { name: 'Walter Aduowo (Doki)', phone: '', branch: 'Aduowo', registrationPaid: true },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    await prisma.member.upsert({
      where: { id: i + 1 },
      update: member,
      create: { ...member, id: i + 1 },
    });
  }

  console.log(`✅ Seeded ${members.length} members`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
