const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Allow login endpoint without authentication
  if (req.path === '/api/auth/login') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Malformed authorization token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token is invalid or expired' });
  }
};
