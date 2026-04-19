const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  order: { type: Number, required: true },
});

const routeSchema = new mongoose.Schema({
  routeName: { type: String, required: true },
  routeNumber: { type: String, required: true, unique: true },
  stops: [stopSchema],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);