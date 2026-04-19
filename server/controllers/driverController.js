const Driver = require('../models/Driver');

exports.getMe = async (req, res) => {
  const driver = await Driver.findById(req.driver.id)
    .select('-password')
    .populate('assignedRoute');
  if (!driver) return res.status(404).json({ message: 'Driver not found' });
  res.json(driver);
};

exports.updateStatus = async (req, res) => {
  const { isActive } = req.body;
  await Driver.findByIdAndUpdate(req.driver.id, { isActive });
  res.json({ success: true });
};