const mysql = require('mysql2');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'admin';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'app_production';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const replicaConfig = {
  host: process.env.DB_REPLICA_HOST || 'localhost',
  user: process.env.DB_REPLICA_USER || 'readonly_user',
  password: process.env.DB_REPLICA_PASSWORD || '',
  database: DB_NAME
};

const replicaPool = mysql.createPool(replicaConfig);

function getConnection() {
  return pool.promise();
}

function getReplicaConnection() {
  return replicaPool.promise();
}

module.exports = {
  getConnection,
  getReplicaConnection,
  pool,
  replicaPool
};
