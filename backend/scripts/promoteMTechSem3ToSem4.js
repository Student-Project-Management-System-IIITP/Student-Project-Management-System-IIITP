// Scheduled job to promote M.Tech Sem 3 students to Sem 4
const mongoose = require('mongoose');
const Student = require('../models/Student');
const cron = require('node-cron');

// Set your promotion schedule here (e.g., every day at 2:00 AM)
const PROMOTION_CRON = '0 2 * * *';

async function promoteMTechSem3ToSem4() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    const result = await Student.updateMany(
      { degree: 'M.Tech', semester: 3 },
      { $set: { semester: 4, updatedAt: new Date() } }
    );
    console.log(`[${new Date().toISOString()}] Promoted ${result.modifiedCount} M.Tech Sem 3 students to Sem 4.`);
  } catch (err) {
    console.error('Promotion error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

// Schedule the job
cron.schedule(PROMOTION_CRON, promoteMTechSem3ToSem4);

// For manual execution
if (require.main === module) {
  promoteMTechSem3ToSem4().then(() => process.exit(0));
}
