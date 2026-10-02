const express = require('express');
const {
  register,
  login,
  getMe,
} = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const {
  validateRegistration,
  validateLogin,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.get('/me', authenticateToken, getMe);
router.get('/protected-test', authenticateToken, (req, res) => {
  return res.status(200).json({
    message: 'You are authenticated',
    user: req.user,
  });
});
router.get(
  '/supplier-test',
  authenticateToken,
  authorizeRoles('SUPPLIER'),
  (req, res) => {
    return res.status(200).json({
      message: 'Supplier access granted',
    });
  },
);
router.get(
  '/shop-test',
  authenticateToken,
  authorizeRoles('SHOP'),
  (req, res) => {
    return res.status(200).json({
      message: 'Shop access granted',
    });
  },
);

module.exports = router;
