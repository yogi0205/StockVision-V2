const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authorization = req.get('Authorization');

  if (!authorization) {
    return res.status(401).json({
      message: 'Authentication required',
    });
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return res.status(401).json({
      message: 'Invalid or expired token',
    });
  }

  try {
    req.user = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired token',
    });
  }

  return next();
}

module.exports = {
  authenticateToken,
};
