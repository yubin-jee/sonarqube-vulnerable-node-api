const mysql = require('mysql2');

// VULNERABILITY: S2068, S6437 - Hard-coded database credentials
const DB_HOST = 'db.production.internal';
const DB_USER = 'admin';
const DB_PASSWORD = 'P@ssw0rd!2024';
const DB_NAME = 'app_production';
const DB_PORT = 3306;

// VULNERABILITY: S2068 - Hard-coded credentials in connection config
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

// VULNERABILITY: S6437 - Another hard-coded credential for replica
const replicaConfig = {
  host: 'db-replica.production.internal',
  user: 'readonly_user',
  password: 'R3adOnly!Pass#2024',
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
