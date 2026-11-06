const History = require('../models/History');
const { v4: uuidv4 } = require('uuid');

/**
 * Log user activity into History collection
 * @param {string} userId - User identifier
 * @param {string} activity - Short activity name (e.g. 'REGISTER', 'LOGIN', 'DOWNLOAD')
 * @param {string} description - Details about the action
 */
async function logActivity(userId, activity, description) {
  try {
    const historyEntry = new History({
      history_id: 'hist_' + uuidv4().slice(0, 10),
      user_id: userId,
      activity: activity,
      description: description,
      timestamp: new Date()
    });
    await historyEntry.save();
    return historyEntry;
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

module.exports = { logActivity };

