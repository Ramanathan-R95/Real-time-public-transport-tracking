const jwt = require('jsonwebtoken');

function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin')
      return res.status(403).json({ message: 'Admin access only' });
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = adminAuth;