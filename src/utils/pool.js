const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: '13.126.69.234', // Replace with your MySQL host
  user: 'dev_bhadohi_user',      // Replace with your MySQL username
  password: 'Bhadohi@321##$$', // Replace with your MySQL password
  database: 'dev_bhadohi_property', // Replace with your database name
  waitForConnections: true, // Wait if no connections are available
  connectionLimit: 10,      // Number of connections in the pool
  queueLimit: 0,            // No limit on the number of requests in the queue
});



module.exports = pool;