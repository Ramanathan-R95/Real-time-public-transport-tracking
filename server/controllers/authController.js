const jwt    = require('jsonwebtoken');
const Driver = require('../models/Driver');

function signToken(driver) {
  return jwt.sign(
    {
      id:            driver._id,
      email:         driver.email,
      vehicleNumber: driver.vehicleNumber,
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const driver = await Driver.findOne({ email: email.toLowerCase() })
      .populate('assignedRoute');

    if (!driver || !(await driver.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(driver);

    res.json({
      token,
      driver: {
        id:            driver._id,
        name:          driver.name,
        email:         driver.email,
        vehicleNumber: driver.vehicleNumber,
        assignedRoute: driver.assignedRoute || null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, vehicleNumber, phone } = req.body;

    // Validate required fields
    if (!name?.trim())
      return res.status(400).json({ message: 'Name is required' });
    if (!email?.trim())
      return res.status(400).json({ message: 'Email is required' });
    if (!password || password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (!vehicleNumber?.trim())
      return res.status(400).json({ message: 'Vehicle number is required' });

    // Check duplicate email
    const existing = await Driver.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: 'An account with this email already exists' });

    // Create driver
    const driver = await Driver.create({
      name:          name.trim(),
      email:         email.trim().toLowerCase(),
      password,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      phone:         phone?.trim() || '',
      assignedRoute: null,
      isActive:      false,
    });

    const token = signToken(driver);

    // Return everything the frontend needs
    res.status(201).json({
      token,
      driver: {
        id:            driver._id,
        name:          driver.name,
        email:         driver.email,
        vehicleNumber: driver.vehicleNumber,
        assignedRoute: null,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    // Handle duplicate key error (race condition)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
};