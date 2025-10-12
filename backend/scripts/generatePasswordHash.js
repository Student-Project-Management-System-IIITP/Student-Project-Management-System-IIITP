const bcrypt = require('bcrypt');

async function generateHash(password) {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  console.log('\nPassword Hash Generator');
  console.log('======================');
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('\nYou can update this hash directly in MongoDB.');
}

const password = process.argv[2];

if (!password) {
  console.log('Usage: node generatePasswordHash.js <password>');
  console.log('Example: node generatePasswordHash.js MyNewPassword123');
  process.exit(1);
}

generateHash(password);

