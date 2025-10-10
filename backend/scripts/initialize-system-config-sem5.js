const mongoose = require('mongoose');
const SystemConfig = require('../models/SystemConfig');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/spms', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize system configurations
const initializeConfigs = async () => {
  try {
    console.log('Initializing system configurations...');
    
    const count = await SystemConfig.initializeDefaults();
    
    console.log(`✅ Successfully initialized ${count} default configurations`);
    
    // Display all configs
    const allConfigs = await SystemConfig.find().sort({ category: 1, configKey: 1 });
    console.log('\n📋 Current System Configurations:');
    console.log('─'.repeat(80));
    
    allConfigs.forEach(config => {
      console.log(`\n🔧 ${config.configKey}`);
      console.log(`   Category: ${config.category}`);
      console.log(`   Value: ${config.configValue}`);
      console.log(`   Type: ${config.configType}`);
      console.log(`   Description: ${config.description}`);
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log('✅ Initialization complete!');
    
  } catch (error) {
    console.error('❌ Error initializing configurations:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await initializeConfigs();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
  process.exit(0);
};

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

