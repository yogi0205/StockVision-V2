const {
  registerUser,
  loginUser,
  findUserById,
} = require('../services/auth.service');

async function register(req, res) {
  const user = await registerUser(req.body);

  return res.status(201).json({
    message: 'Registration successful',
    user,
  });
}

async function login(req, res) {
  const result = await loginUser(req.body);

  return res.status(200).json({
    message: 'Login successful',
    token: result.token,
    user: result.user,
  });
}

async function getMe(req, res) {
  const user = await findUserById(req.user.userId);

  if (!user) {
    return res.status(404).json({
      message: 'User not found',
    });
  }

  if (!user.is_active) {
    return res.status(403).json({
      message: 'Account is inactive',
    });
  }

  return res.status(200).json({ user });
}

module.exports = {
  register,
  login,
  getMe,
};
