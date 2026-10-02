const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

function createConflictError() {
  const error = new Error('Email is already registered');
  error.status = 409;
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
        [registration.name, email, passwordHash, registration.role],
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

module.exports = {
  registerUser,
};
