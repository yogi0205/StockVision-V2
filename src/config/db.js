const mysql = require('mysql2/promise');
const { database } = require('./env');

const pool = mysql.createPool({
  host: database.host,
  port: database.port,
  user: database.user,
  password: database.password,
  database: database.name,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();

    console.log('MySQL database connected successfully');

    connection.release();
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  testDatabaseConnection,
};