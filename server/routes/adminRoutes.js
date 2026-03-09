const express = require('express');
const router = express.Router();
const { getAllUsers, getUserLogs, editUserLog, promoteUser, demoteUser, setAdminGroupPermissions, renameUser, assignBrahmacari, revokeBrahmacari, changeUserGroup, triggerWeeklyReportConsolidated, getPendingApprovals, approveManual } = require('../controllers/adminController');
const { protect, adminObj, ownerOnly } = require('../middleware');

router.get('/users', protect, adminObj, getAllUsers);
router.get('/users/:userId/logs', protect, adminObj, getUserLogs);
router.get('/pending-approvals', protect, ownerOnly, getPendingApprovals);
router.put('/logs/:logId', protect, adminObj, editUserLog);
router.put('/users/:userId/promote', protect, ownerOnly, promoteUser);
router.put('/users/:userId/demote', protect, ownerOnly, demoteUser);
router.put('/users/:userId/group-permissions', protect, ownerOnly, setAdminGroupPermissions);
router.put('/users/:userId/rename', protect, ownerOnly, renameUser);
router.put('/users/:userId/assign-brahmacari', protect, ownerOnly, assignBrahmacari);
router.put('/users/:userId/revoke-brahmacari', protect, ownerOnly, revokeBrahmacari);
router.put('/users/:userId/change-group', protect, ownerOnly, changeUserGroup);
router.put('/users/:userId/approve-manual', protect, ownerOnly, approveManual);

// Manual trigger for consolidated weekly reports (Owner only)
router.post('/trigger-weekly-report', protect, ownerOnly, triggerWeeklyReportConsolidated);

module.exports = router;
