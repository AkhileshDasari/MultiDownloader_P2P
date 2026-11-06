const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Download = require('../models/Download');
const History = require('../models/History');
const P2PFile = require('../models/P2PFile');
const Peer = require('../models/Peer');

const { authenticateToken } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { logActivity } = require('../services/activityLogger');

// All admin routes require valid token + Admin role
router.use(authenticateToken, adminOnly);

/**
 * GET /api/admin/users
 * View all users with account status and roles
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).sort({ created_at: -1 });

    // Aggregate downloads count per user
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const downloadCount = await Download.countDocuments({ user_id: u.user_id });
        const lastActivity = await History.findOne({ user_id: u.user_id }).sort({ timestamp: -1 });
        return {
          ...u.toObject(),
          total_downloads: downloadCount,
          last_activity: lastActivity ? lastActivity.timestamp : u.created_at
        };
      })
    );

    return res.json({
      success: true,
      users: usersWithStats
    });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

/**
 * PATCH /api/admin/users/:id/freeze
 * Freeze user account (prevents login and downloads)
 */
router.patch('/users/:id/freeze', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ user_id: id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'Admin') {
      return res.status(400).json({ success: false, message: 'Cannot freeze an administrator account.' });
    }

    user.status = 'Frozen';
    await user.save();

    await logActivity(
      user.user_id,
      'ACCOUNT_FROZEN',
      `Account frozen by administrator (${req.user.name})`
    );

    return res.json({
      success: true,
      message: `User ${user.name} has been frozen.`,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Freeze user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to freeze user.' });
  }
});

/**
 * PATCH /api/admin/users/:id/unfreeze
 * Unfreeze user account (restores access)
 */
router.patch('/users/:id/unfreeze', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ user_id: id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.status = 'Active';
    await user.save();

    await logActivity(
      user.user_id,
      'ACCOUNT_UNFROZEN',
      `Account unfrozen by administrator (${req.user.name})`
    );

    return res.json({
      success: true,
      message: `User ${user.name} has been unfrozen.`,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Unfreeze user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unfreeze user.' });
  }
});

/**
 * GET /api/admin/downloads
 * View all download activities across the entire network
 */
router.get('/downloads', async (req, res) => {
  try {
    const downloads = await Download.find().sort({ started_at: -1 }).limit(200);

    // Map user names for convenience
    const userIds = [...new Set(downloads.map(d => d.user_id))];
    const users = await User.find({ user_id: { $in: userIds } }, { user_id: 1, name: 1, email: 1 });
    const userMap = {};
    users.forEach(u => { userMap[u.user_id] = u; });

    const enrichedDownloads = downloads.map(d => ({
      ...d.toObject(),
      user_name: userMap[d.user_id]?.name || 'Unknown User',
      user_email: userMap[d.user_id]?.email || ''
    }));

    return res.json({
      success: true,
      downloads: enrichedDownloads
    });
  } catch (err) {
    console.error('Admin downloads error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch downloads.' });
  }
});

/**
 * GET /api/admin/stats
 * Overview dashboard stats
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'Active' });
    const frozenUsers = await User.countDocuments({ status: 'Frozen' });
    const totalDownloads = await Download.countDocuments();
    const completedDownloads = await Download.countDocuments({ download_status: 'Completed' });
    const totalFiles = await P2PFile.countDocuments();
    const activePeers = await Peer.countDocuments({ status: 'Online' });

    return res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        frozenUsers,
        totalDownloads,
        completedDownloads,
        totalFiles,
        activePeers
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch statistics.' });
  }
});

module.exports = router;

