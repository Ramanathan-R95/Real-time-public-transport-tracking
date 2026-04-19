const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getAllRoutes,
  getRouteById,
  createRoute,
  getMyRoute,
  updateMyRoute,
} = require('../controllers/routeController');

router.get('/', getAllRoutes);
router.get('/my', auth, getMyRoute);
router.get('/:id', getRouteById);
router.post('/', auth, createRoute);
router.put('/my', auth, updateMyRoute);

module.exports = router;