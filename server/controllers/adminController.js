const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');
const Route = require('../models/Route');
const TripLog = require('../models/TripLog');
const redisService = require('../services/redisService');

function signAdminToken(admin) {
  return jwt.sign(
    { id: admin._id, email: admin.email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// ── Auth ──
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin || !(await admin.matchPassword(password)))
    return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ token: signAdminToken(admin), admin: { id: admin._id, name: admin.name, email: admin.email } });
};

// ── Dashboard stats ──
exports.getStats = async (req, res) => {
  const [totalDrivers, totalRoutes, totalTrips, activeTrips] = await Promise.all([
    Driver.countDocuments(),
    Route.countDocuments({ isActive: true }),
    TripLog.countDocuments(),
    TripLog.countDocuments({ status: 'active' }),
  ]);
  const activeBuses = await redisService.getAllActiveBuses();
  res.json({ totalDrivers, totalRoutes, totalTrips, activeTrips, activeBuses });
};

// ── Drivers ──
exports.getAllDrivers = async (req, res) => {
  const drivers = await Driver.find()
    .select('-password')
    .populate('assignedRoute', 'routeName routeNumber');
  res.json(drivers);
};

exports.createDriver = async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json({ id: driver._id, name: driver.name, email: driver.email });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const driver = await Driver.findByIdAndUpdate(req.params.id, rest, { new: true }).select('-password');
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteDriver = async (req, res) => {
  await Driver.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

// ── Routes ──
exports.getAllRoutes = async (req, res) => {
  const routes = await Route.find()
    .populate('createdBy', 'name vehicleNumber');
  res.json(routes);
};

exports.deleteRoute = async (req, res) => {
  await Route.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

// ── Trips ──
exports.getAllTrips = async (req, res) => {
  const trips = await TripLog.find()
    .populate('driver', 'name vehicleNumber')
    .populate('route', 'routeName routeNumber')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(trips);
};

exports.getTripById = async (req, res) => {
  const trip = await TripLog.findById(req.params.id)
    .populate('driver', 'name vehicleNumber')
    .populate('route', 'routeName routeNumber stops');
  if (!trip) return res.status(404).json({ message: 'Trip not found' });
  res.json(trip);
};