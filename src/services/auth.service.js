const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function createConflictError() {
  const error = new Error('Email is already registered');
  error.status = 409;
  return error;
}

function createAuthenticationError() {
  const error = new Error('Invalid email or password');
  error.status = 401;
  return error;
}

async function registerUser(registration) {
  const email = registration.email.toLowerCase();

  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email],
  );

  if (existingUsers.length > 0) {
    throw createConflictError();
  }

  const passwordHash = await bcrypt.hash(registration.password, 12);

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    let result;

    try {
      [result] = await connection.execute(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES (?, ?, ?, ?)`,
        [
          registration.name,
          email,
          passwordHash,
          registration.role,
        ],
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw createConflictError();
      }

      throw error;
    }

    const userId = result.insertId;

    if (registration.role === 'SUPPLIER') {
      await connection.execute(
        `INSERT INTO suppliers (user_id, company_name, phone, location)
         VALUES (?, ?, ?, ?)`,
        [
          userId,
          registration.companyName,
          registration.phone || null,
          registration.location || null,
        ],
      );
    } else {
      await connection.execute(
        `INSERT INTO shops (user_id, shop_name, phone, location)
         VALUES (?, ?, ?, ?)`,
        [
          userId,
          registration.shopName,
          registration.phone || null,
          registration.location || null,
        ],
      );
    }

    await connection.commit();
    transactionStarted = false;

    return {
      id: userId,
      name: registration.name,
      email,
      role: registration.role,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Registration failed and the transaction could not be rolled back',
        );
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function loginUser(credentials) {
  const email = credentials.email.toLowerCase();

  const [users] = await pool.execute(
    `SELECT id, name, email, password_hash, role, is_active
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  const user = users[0];

  if (!user) {
    throw createAuthenticationError();
  }

  if (!user.is_active) {
    const error = new Error('Account is inactive');
    error.status = 403;
    throw error;
  }

  // Temporary production login diagnostic.
  // Does not log password or password_hash.
  console.log('LOGIN USER CHECK:', {
    id: user.id,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
  });

  const passwordMatches = await bcrypt.compare(
    credentials.password,
    user.password_hash,
  );

  console.log('PASSWORD MATCH RESULT:', passwordMatches);

  if (!passwordMatches) {
    throw createAuthenticationError();
  }

  if (!jwtSecret) {
    const error = new Error('JWT_SECRET is not configured');
    error.status = 500;
    throw error;
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    jwtSecret,
    {
      expiresIn: jwtExpiresIn,
      noTimestamp: true,
    },
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

async function findUserById(userId) {
  const [users] = await pool.execute(
    `SELECT id, name, email, role, is_active
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  return users[0] || null;
}

module.exports = {
  registerUser,
  loginUser,
  findUserById,
};