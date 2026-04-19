const mongoose = require('mongoose');

const pingSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  accuracy: Number,
  timestamp: Date,
  speed: Number,
});

const tripLogSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  pings: [pingSchema],
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('TripLog', tripLogSchema);