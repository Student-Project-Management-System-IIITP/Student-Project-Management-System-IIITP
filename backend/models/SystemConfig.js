const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  // Config Key (unique identifier)
  configKey: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Config Value (flexible data type)
  configValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Config Type (for validation)
  configType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  
  // Description
  description: {
    type: String,
    trim: true
  },
  
  // Category (for grouping configs)
  category: {
    type: String,
    enum: ['general', 'academic', 'sem4', 'sem5', 'sem6', 'sem7', 'sem8', 'faculty', 'student', 'evaluation'],
    default: 'general'
  },
  
  // Is Active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Last Updated By
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
// Note: configKey already has unique index from schema definition
systemConfigSchema.index({ category: 1 });

// Pre-save middleware
systemConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get config value
systemConfigSchema.statics.getConfigValue = async function(key, defaultValue = null) {
  try {
    const config = await this.findOne({ configKey: key, isActive: true });
    return config ? config.configValue : defaultValue;
  } catch (error) {
    console.error('Error getting config value:', error);
    return defaultValue;
  }
};

// Static method to set config value
systemConfigSchema.statics.setConfigValue = async function(key, value, type, description, category = 'general', userId = null) {
  try {
    const config = await this.findOneAndUpdate(
      { configKey: key },
      {
        configKey: key,
        configValue: value,
        configType: type,
        description: description,
        category: category,
        updatedBy: userId,
        updatedAt: Date.now()
      },
      { upsert: true, new: true }
    );
    return config;
  } catch (error) {
    console.error('Error setting config value:', error);
    throw error;
  }
};

// Static method to get all configs by category
systemConfigSchema.statics.getConfigsByCategory = async function(category) {
  try {
    return await this.find({ category: category, isActive: true }).sort({ configKey: 1 });
  } catch (error) {
    console.error('Error getting configs by category:', error);
    return [];
  }
};

// Static method to initialize default configs
systemConfigSchema.statics.initializeDefaults = async function() {
  const defaults = [
    {
      configKey: 'sem5.facultyPreferenceLimit',
      configValue: 7,
      configType: 'number',
      description: 'Number of faculty preferences required for Sem 5 Minor Project 2 registration',
      category: 'sem5'
    },
    {
      configKey: 'sem5.minGroupMembers',
      configValue: 4,
      configType: 'number',
      description: 'Minimum number of members required in a Sem 5 group',
      category: 'sem5'
    },
    {
      configKey: 'sem5.maxGroupMembers',
      configValue: 5,
      configType: 'number',
      description: 'Maximum number of members allowed in a Sem 5 group',
      category: 'sem5'
    },
    {
      configKey: 'academic.currentYear',
      configValue: '2025-26',
      configType: 'string',
      description: 'Current academic year',
      category: 'academic'
    }
    ,
    // Sem 7 windows (B.Tech)
    {
      configKey: 'sem7.choiceWindow',
      configValue: { start: null, end: null },
      configType: 'object',
      description: 'Window for students to choose Internship or Coursework in Sem 7',
      category: 'sem7'
    },
    {
      configKey: 'sem7.sixMonthSubmissionWindow',
      configValue: { start: null, end: null },
      configType: 'object',
      description: 'Window to submit 6-month internship company details',
      category: 'sem7'
    },
    {
      configKey: 'sem7.sixMonthVerificationWindow',
      configValue: { start: null, end: null },
      configType: 'object',
      description: 'Window for admin verification of 6-month internship details',
      category: 'sem7'
    },
    {
      configKey: 'sem7.major1.groupFormationWindow',
      configValue: { start: null, end: null },
      configType: 'object',
      description: 'Window for Major Project 1 group formation',
      category: 'sem7'
    },
    {
      configKey: 'sem7.major1.preferenceWindow',
      configValue: { start: null, end: null },
      configType: 'object',
      description: 'Window for Major Project 1 faculty preferences',
      category: 'sem7'
    },
    {
      configKey: 'sem7.internship2.evidenceWindow',
      configValue: { start: null, end: null },
      configType: 'object',
      description: 'Window to submit 2-month internship evidence (summer)',
      category: 'sem7'
    },
    {
      configKey: 'sem7.internship1.registrationWindow',
      configValue: { start: null, end: null },
      configType: 'object',
      description: 'Window for Internship 1 (solo project) registration and preferences',
      category: 'sem7'
    },
    {
      configKey: 'sem7.major1.facultyPreferenceLimit',
      configValue: 5,
      configType: 'number',
      description: 'Number of faculty preferences required for Sem 7 Major Project 1 registration',
      category: 'sem7'
    },
    {
      configKey: 'sem7.internship1.facultyPreferenceLimit',
      configValue: 5,
      configType: 'number',
      description: 'Number of faculty preferences required for Sem 7 Internship 1 registration',
      category: 'sem7'
    }
  ];

  for (const config of defaults) {
    await this.setConfigValue(
      config.configKey,
      config.configValue,
      config.configType,
      config.description,
      config.category
    );
  }

  return defaults.length;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
