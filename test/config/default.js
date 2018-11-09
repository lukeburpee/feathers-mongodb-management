var containerized = require('containerized')();

module.exports = {
  port: process.env.PORT || 8081,
  host: 'localhost',
  paginate: {
    default: 10,
    max: 50
  },
  db: {
    url: containerized ? 'mongodb://mongodb:27017' : 'mongodb://localhost:27017',
    dbName: 'feathers-test',
    defaultOptions: {
      useNewUrlParser: true,
      poolSize: 10,
      autoReconnect: true,
      keepAlive: 30000
    }
  }
};
