const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const feedbackSchema = require('../validation/feedbackvalidation');
const Sentiment = require('sentiment');
const sentimentAnalyzer = new Sentiment();
const nodemailer = require('nodemailer');

const EMAIL_ENABLED = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_TO);

// Optional email transporter (only used if env configured)
let transporter;
if (EMAIL_ENABLED) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

/**
 * POST /api/feedback
 * body: { name, email, rating, message, metadata }
 */
router.post('/', async (req, res) => {('../validation/feedbackValidation')
  try {
    // Validate input
    const { error, value } = feedbackSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });

    // Sentiment analysis
    const text = (value.message || '') + ' ' + (value.name || '');
    const result = sentimentAnalyzer.analyze(text);
    let sentiment = 'neutral';
    if (result.score > 1) sentiment = 'positive';
    else if (result.score < -1) sentiment = 'negative';

    const doc = new Feedback({
      name: value.name || 'Anonymous',
      email: value.email,
      rating: value.rating,
      message: value.message,
      metadata: value.metadata || {},
      sentiment
    });

    const saved = await doc.save();

    // Optional email notification
    if (EMAIL_ENABLED) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: process.env.EMAIL_TO,
          subject: `New feedback (${sentiment}) - rating ${saved.rating}`,
          text: `Name: ${saved.name}\nEmail: ${saved.email || 'N/A'}\nRating: ${saved.rating}\nSentiment: ${saved.sentiment}\nMessage:\n${saved.message}`,
        });
      } catch (mailErr) {
        console.warn('Failed to send notification email:', mailErr.message);
      }
    }

    return res.status(201).json({ message: 'Feedback received', feedback: saved });
  } catch (err) {
    console.error('POST /api/feedback error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
