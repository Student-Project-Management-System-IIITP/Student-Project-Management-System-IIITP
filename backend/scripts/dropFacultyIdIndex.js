/*
  One-time script to drop the legacy facultyId_1 index from the faculties collection.
  Usage: Ensure MONGODB_URI is set in backend/.env, then run: npm run fix:drop-faculty-id-index
*/

const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined. Please set it in backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const collection = db.collection('faculties');

    const indexes = await collection.indexes();
    const hasFacultyIdIndex = indexes.some((idx) => idx.name === 'facultyId_1');

    if (hasFacultyIdIndex) {
      console.log('Dropping index facultyId_1 from faculties...');
      await collection.dropIndex('facultyId_1');
      console.log('Dropped index facultyId_1 successfully.');
    } else {
      console.log('Index facultyId_1 not found. Nothing to do.');
    }

    console.log('Current indexes:', await collection.indexes());
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log('Index facultyId_1 already removed.');
    } else {
      console.error('Error while dropping index:', err);
      process.exitCode = 1;
    }
  } finally {
    await mongoose.connection.close();
  }
}

run();


