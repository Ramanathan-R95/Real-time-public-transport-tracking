const router = require('express').Router();
const auth   = require('../middleware/auth');
const {
  getAllRoutes,
  getRouteById,
  createRoute,
  getMyRoute,
  updateMyRoute,
} = require('../controllers/routeController');

// IMPORTANT: /my must be registered BEFORE /:id
// otherwise Express treats "my" as a route id
router.get('/my',  auth, getMyRoute);
router.put('/my',  auth, updateMyRoute);

router.get('/',    getAllRoutes);
router.get('/:id', getRouteById);
router.post('/',   auth, createRoute);

module.exports = router;