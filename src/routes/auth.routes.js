const express = require('express');
const { register } = require('../controllers/auth.controller');
const { validateRegistration } = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', validateRegistration, register);

module.exports = router;
