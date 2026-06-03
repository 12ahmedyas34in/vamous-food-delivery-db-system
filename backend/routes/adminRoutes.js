// backend/routes/adminRoutes.js
//
// Phase 3 Push 2 — Admin-only routes
// Mounted at /api/admin in server.js
// All routes: protect + restrictTo('admin')

const express = require('express');
const router  = express.Router();
const { protect, restrictTo }           = require('../middleware/authMiddleware');
const { getPendingApplications,
        approveApplication,
        rejectApplication,
        getActivePartners,
        togglePartnerStatus }           = require('../controllers/adminController');
const { confirmTransfer }               = require('../controllers/paymentController');

// Apply auth guard to every route in this file
router.use(protect, restrictTo('admin'));

// ── Applications ──────────────────────────────────────────────────────────────
// GET  /api/admin/applications                    — list all pending (is_active: false)
// POST /api/admin/applications/:type/:id/approve  — approve restaurant or driver
// POST /api/admin/applications/:type/:id/reject   — reject and soft-delete
router.get('/applications',                        getPendingApplications);
router.post('/applications/:type/:id/approve',     approveApplication);
router.post('/applications/:type/:id/reject',      rejectApplication);

// ── Partners ──────────────────────────────────────────────────────────────────
// GET   /api/admin/partners                              — list all active partners
// PATCH /api/admin/partners/:type/:id/toggle-active      — toggle is_active
router.get('/partners',                            getActivePartners);
router.patch('/partners/:type/:id/toggle-active',  togglePartnerStatus);

// ── Payments ──────────────────────────────────────────────────────────────────
// POST /api/admin/confirm-payment/:orderId  — confirm Bank Transfer / Tele Birr
router.post('/confirm-payment/:orderId',           confirmTransfer);

module.exports = router;
