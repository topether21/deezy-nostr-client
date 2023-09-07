const { Sequelize } = require('sequelize');

console.log(
  'db config',
  process.env.TRACKING_SERVICE_DB_NAME,
  process.env.TRACKING_SERVICE_DB_USER,
  process.env.TRACKING_SERVICE_DB_PASSWORD,
  {
    host: process.env.TRACKING_SERVICE_DB_HOST,
    port: process.env.TRACKING_SERVICE_DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // added for simplicity, you may want to verify the server's identity
      },
    },
  }
);

const sequelize = new Sequelize(
  process.env.TRACKING_SERVICE_DB_NAME,
  process.env.TRACKING_SERVICE_DB_USER,
  process.env.TRACKING_SERVICE_DB_PASSWORD,
  {
    logging: false,
    host: process.env.TRACKING_SERVICE_DB_HOST,
    port: process.env.TRACKING_SERVICE_DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // added for simplicity, you may want to verify the server's identity
      },
    },
  }
);

module.exports = sequelize;
