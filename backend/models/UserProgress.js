const mongoose = require('mongoose');

const moduleProgressSchema = new mongoose.Schema({
  moduleId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['not_started', 'in_progress', 'completed'], 
    default: 'not_started' 
  },
  startedAt: Date,
  completedAt: Date,
  assessmentScore: Number,
  attempts: { type: Number, default: 0 }
});

const userProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  completedAt: Date,
  status: { 
    type: String, 
    enum: ['enrolled', 'in_progress', 'completed', 'dropped'], 
    default: 'enrolled' 
  },
  moduleProgress: [moduleProgressSchema],
  overallProgress: { type: Number, default: 0, min: 0, max: 100 }, // percentage
  certificateIssued: { type: Boolean, default: false },
  certificateUrl: String,
  certificateId: String,
  certificateGeneratedAt: Date
}, {
  timestamps: true
});

// Compound index to ensure one progress record per user per course
userProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('UserProgress', userProgressSchema);