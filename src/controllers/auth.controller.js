const { registerUser } = require('../services/auth.service');

async function register(req, res) {
  const user = await registerUser(req.body);

  return res.status(201).json({
    message: 'Registration successful',
    user,
  });
}

module.exports = {
  register,
};
