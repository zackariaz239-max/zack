const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'Anonymous'
  },
  email: {
    type: String,
    trim: true,
    maxlength: 254
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  metadata: {
    // optional JSON field for extra structured info (browser, page, productId, etc)
    type: Object,
    default: {}
  },
  sentiment: {
    // e.g. 'positive' | 'neutral' | 'negative'
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  }
}, { timestamps: true }); // createdAt / updatedAt

module.exports = mongoose.model('Feedback', FeedbackSchema);
