const Route = require('../models/Route');
const Driver = require('../models/Driver');

exports.getAllRoutes = async (req, res) => {
  const routes = await Route.find({ isActive: true }).populate('createdBy', 'name vehicleNumber');
  res.json(routes);
};

exports.getRouteById = async (req, res) => {
  const route = await Route.findById(req.params.id);
  if (!route) return res.status(404).json({ message: 'Route not found' });
  res.json(route);
};

exports.createRoute = async (req, res) => {
  try {
    const { routeName, routeNumber, stops } = req.body;

    // Check duplicate route number
    const existing = await Route.findOne({ routeNumber });
    if (existing) return res.status(409).json({ message: 'Route number already exists' });

    const route = await Route.create({
      routeName,
      routeNumber,
      stops,
      createdBy: req.driver.id,
    });

    // Assign this route to the driver
    await Driver.findByIdAndUpdate(req.driver.id, { assignedRoute: route._id });

    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getMyRoute = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id).populate('assignedRoute');
    if (!driver?.assignedRoute) return res.json(null);
    res.json(driver.assignedRoute);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMyRoute = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);
    if (!driver?.assignedRoute) return res.status(404).json({ message: 'No route assigned' });

    const { routeName, routeNumber, stops } = req.body;
    const route = await Route.findByIdAndUpdate(
      driver.assignedRoute,
      { routeName, routeNumber, stops },
      { new: true }
    );
    res.json(route);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};