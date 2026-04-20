const mongoose = require('mongoose');

// Stores average travel time between consecutive stops
const segmentSchema = new mongoose.Schema({
  routeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  fromStopIdx: { type: Number, required: true }, // 0-based index
  toStopIdx:   { type: Number, required: true },
  samples:     [{ travelTimeSeconds: Number, recordedAt: Date }],
  avgSeconds:  { type: Number, default: null },
  sampleCount: { type: Number, default: 0 },
}, { timestamps: true });

// Compound index so lookup is instant
segmentSchema.index({ routeId: 1, fromStopIdx: 1, toStopIdx: 1 }, { unique: true });

module.exports = mongoose.model('SegmentStats', segmentSchema);