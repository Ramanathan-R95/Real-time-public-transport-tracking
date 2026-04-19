const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const c = require('../controllers/adminController');

router.post('/login', c.login);

router.get('/stats',           adminAuth, c.getStats);
router.get('/drivers',         adminAuth, c.getAllDrivers);
router.post('/drivers',        adminAuth, c.createDriver);
router.put('/drivers/:id',     adminAuth, c.updateDriver);
router.delete('/drivers/:id',  adminAuth, c.deleteDriver);
router.get('/routes',          adminAuth, c.getAllRoutes);
router.delete('/routes/:id',   adminAuth, c.deleteRoute);
router.get('/trips',           adminAuth, c.getAllTrips);
router.get('/trips/:id',       adminAuth, c.getTripById);

module.exports = router;