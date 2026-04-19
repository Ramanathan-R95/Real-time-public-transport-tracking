const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

function signToken(driver) {
  return jwt.sign(
    { id: driver._id, email: driver.email, vehicleNumber: driver.vehicleNumber },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  const driver = await Driver.findOne({ email }).populate('assignedRoute');
  if (!driver || !(await driver.matchPassword(password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken(driver);
  res.json({
    token,
    driver: {
      id: driver._id,
      name: driver.name,
      email: driver.email,
      vehicleNumber: driver.vehicleNumber,
      assignedRoute: driver.assignedRoute,
    },
  });
};

exports.register = async (req, res) => {
  const { name, email, password, vehicleNumber, assignedRoute } = req.body;
  try {
    const existing = await Driver.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const driver = await Driver.create({ name, email, password, vehicleNumber, assignedRoute });
    const token = signToken(driver);
    res.status(201).json({ token, driver: { id: driver._id, name: driver.name } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};