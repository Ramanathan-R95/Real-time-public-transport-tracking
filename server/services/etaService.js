const Route        = require('../models/Route');
const SegmentStats = require('../models/SegmentStats');

const R = 6371e3; // earth radius metres

function toRad(d) { return d * Math.PI / 180; }

// Haversine distance in metres
function dist(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find which stop index the bus is nearest to (and hasn't passed)
function nearestStopIdx(lat, lng, stops) {
  let best = 0;
  let bestDist = Infinity;
  stops.forEach((s, i) => {
    const d = dist(lat, lng, s.lat, s.lng);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

// Predict ETA from current position to all remaining stops
// Returns array: [{ stopName, stopIdx, etaSeconds, etaMinutes }]
async function predictETA({ routeId, currentLat, currentLng, currentSpeed = 0 }) {
  const route = await Route.findById(routeId);
  if (!route || !route.stops?.length) return null;

  const stops = route.stops.sort((a, b) => a.order - b.order);
  const nearestIdx = nearestStopIdx(currentLat, currentLng, stops);

  // Distance from current position to nearest stop
  const distToNearest = dist(currentLat, currentLng, stops[nearestIdx].lat, stops[nearestIdx].lng);

  // Speed in m/s — use current speed or fall back to 20 km/h default
  const speedMs = currentSpeed > 0.5 ? currentSpeed : (20 / 3.6);

  const results = [];

  for (let i = nearestIdx; i < stops.length; i++) {
    let secondsToStop = 0;

    if (i === nearestIdx) {
      // Time to reach nearest stop from current position
      secondsToStop = distToNearest / speedMs;
    } else {
      // Look up historical average for this segment
      const seg = await SegmentStats.findOne({
        routeId, fromStopIdx: i - 1, toStopIdx: i,
      });

      if (seg?.avgSeconds) {
        secondsToStop = seg.avgSeconds;
      } else {
        // Fallback: distance / speed
        const d = dist(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng);
        secondsToStop = d / speedMs;
      }

      // Add accumulated time from previous stops
      if (results.length > 0) {
        secondsToStop += results[results.length - 1].etaSeconds;
      }
    }

    results.push({
      stopIdx:    i,
      stopName:   stops[i].name,
      etaSeconds: Math.round(secondsToStop),
      etaMinutes: Math.round(secondsToStop / 60),
    });
  }

  return {
    nearestStopIdx: nearestIdx,
    nearestStopName: stops[nearestIdx].name,
    stops: results,
    confidence: await getConfidence(routeId, nearestIdx, stops.length),
    generatedAt: new Date().toISOString(),
  };
}

// Confidence = % of segments that have historical data
async function getConfidence(routeId, fromIdx, totalStops) {
  const segmentsNeeded = totalStops - fromIdx - 1;
  if (segmentsNeeded <= 0) return 1;
  const segsWithData = await SegmentStats.countDocuments({
    routeId,
    fromStopIdx: { $gte: fromIdx },
    sampleCount: { $gte: 1 },
  });
  return Math.min(1, segsWithData / segmentsNeeded);
}

// Called after each trip completes — learns travel times from ping history
async function learnFromTrip(routeId, pings) {
  if (!pings?.length) return;

  const route = await Route.findById(routeId);
  if (!route?.stops?.length) return;

  const stops = route.stops.sort((a, b) => a.order - b.order);

  // For each consecutive stop pair, find when the bus passed each stop
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to   = stops[i + 1];

    // Find first ping that came within 80m of each stop
    const fromPing = pings.find(p => dist(p.lat, p.lng, from.lat, from.lng) < 80);
    const toPing   = pings.find(p => dist(p.lat, p.lng, to.lat,   to.lng)   < 80
      && new Date(p.timestamp) > (fromPing ? new Date(fromPing.timestamp) : 0));

    if (!fromPing || !toPing) continue;

    const travelSeconds = (new Date(toPing.timestamp) - new Date(fromPing.timestamp)) / 1000;
    if (travelSeconds <= 0 || travelSeconds > 3600) continue; // Sanity: skip if > 1hr

    // Upsert segment stats
    const seg = await SegmentStats.findOneAndUpdate(
      { routeId, fromStopIdx: i, toStopIdx: i + 1 },
      {
        $push: {
          samples: {
            $each: [{ travelTimeSeconds: travelSeconds, recordedAt: new Date() }],
            $slice: -30, // Keep last 30 samples only
          },
        },
        $inc: { sampleCount: 1 },
      },
      { upsert: true, new: true }
    );

    // Recalculate average (weighted: recent samples count more)
    const weights = seg.samples.map((_, idx) => idx + 1); // newer = higher weight
    const total   = weights.reduce((s, w) => s + w, 0);
    const avg     = seg.samples.reduce((s, sample, idx) => s + sample.travelTimeSeconds * weights[idx], 0) / total;

    await SegmentStats.findByIdAndUpdate(seg._id, { avgSeconds: Math.round(avg) });
  }

  console.log(`Learned segment stats for route ${routeId}`);
}

module.exports = { predictETA, learnFromTrip };