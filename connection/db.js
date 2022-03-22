const { Pool } = require('pg');

const dbPool = new Pool({
  host: 'ec2-3-208-121-149.compute-1.amazonaws.com',
  database: 'dbrqfim1ljugrj',
  port: 5432,
  user: 'uaoazdcamzjrpl',
  password: 'f6e2df6b7eb980c833d04be0d042430333cba294d82bb820c41d0c8dece47639'
});

module.exports = dbPool;