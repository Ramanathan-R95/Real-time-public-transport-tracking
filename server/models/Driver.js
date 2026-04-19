const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  assignedRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  isActive: { type: Boolean, default: false },
  vehicleNumber: { type: String, required: true },
}, { timestamps: true });

driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

driverSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Driver', driverSchema);