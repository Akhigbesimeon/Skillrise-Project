const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  questions: [{
    question: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['multiple-choice', 'text', 'code'], 
      required: true 
    },
    options: [String], // for multiple choice questions
    correctAnswer: { type: String, required: true }
  }],
  passingScore: { type: Number, required: true, min: 0, max: 100 }
});

const moduleSchema = new mongoose.Schema({
  moduleId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: String, // HTML content or markdown
  videoUrl: String,
  resources: [String], // URLs to additional resources
  assessment: assessmentSchema
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  difficultyLevel: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    required: true 
  },
  estimatedDuration: { type: Number, required: true }, // in hours
  thumbnailUrl: { type: String, default: '' },
  modules: [moduleSchema],
  prerequisites: [String],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrollmentCount: { type: Number, default: 0 },
  completionCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Index for search and filtering
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1, difficultyLevel: 1 });
courseSchema.index({ isActive: 1 });

module.exports = mongoose.model('Course', courseSchema);