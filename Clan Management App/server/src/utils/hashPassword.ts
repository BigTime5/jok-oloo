import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password <password>');
  process.exit(1);
}

async function run() {
  const hash = await bcrypt.hash(password, 12);
  console.log(`\nPassword hash:\n${hash}\n`);
  console.log('Set this as ADMIN_PASSWORD in your .env file');
}

run();
