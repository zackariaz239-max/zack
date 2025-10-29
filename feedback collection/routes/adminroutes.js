const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// Simple admin auth middleware using ADMIN_TOKEN env var
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ error: 'Admin token not configured on server' });
  }
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * GET /api/admin/feedback
 * Query params:
 *  - q (text search in message or name)
 *  - sentiment (positive|neutral|negative)
 *  - rating (1..5) or ratings (comma separated)
 *  - from (ISO date) - createdAt >= from
 *  - to (ISO date) - createdAt <= to
 *  - page (default 1)
 *  - limit (default 20)
 */
router.get('/feedback', adminAuth, async (req, res) => {
  try {
    const {
      q,
      sentiment,
      rating,
      ratings,
      from,
      to,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const filter = {};

    if (q) {
      // basic text search across message and name
      filter.$or = [
        { message: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    if (sentiment && ['positive', 'neutral', 'negative'].includes(sentiment)) {
      filter.sentiment = sentiment;
    }

    if (rating) {
      filter.rating = Number(rating);
    } else if (ratings) {
      const arr = String(ratings).split(',').map(s => Number(s)).filter(n => !isNaN(n));
      if (arr.length) filter.rating = { $in: arr };
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d)) filter.createdAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d)) filter.createdAt.$lte = d;
      }
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Feedback.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Feedback.countDocuments(filter)
    ]);

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      items
    });
  } catch (err) {
    console.error('GET /api/admin/feedback error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
