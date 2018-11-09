import { Service } from './service';

// Create the service.
class DatabaseService extends Service {
  constructor (options) {
    super(options);
    if (!options.client) {
      throw new Error('MongoDB client must be provided');
    }
    if (!options.dbName) {
      throw new Error('MongoDB database name must be provided');
    }
    this.id = options.id || 'name';
    this.events = options.events || [];
    this.paginate = options.paginate || {};
    this.client = options.client;
    this.defaultOptions = options.defaultOptions;
    // Use the admin database for some operations
    this.adminDb = options.client.db(options.dbName).admin();
    this.checkAdminDb(this.adminDb);
  }

  checkAdminDb (db) {
    if (db === null) {
      throw new Error('MongoDB admin cannot be retrieved, ensure the connection user has correct privileges');
    }
    this.adminStatus = true;
  }

  // Helper function to process stats object
  processObjectInfos (infos) {
    // In Mongo the db name key is db, change to the more intuitive name just as in create
    infos.name = infos.db;
    delete infos.db;
    return infos;
  }

  createImplementation (id, options) {
    return this.client.db(id, options || this.defaultOptions).stats()
    .then(infos => this.processObjectInfos(infos));
  }

  getImplementation (id, params) {
    return Promise.resolve(this.client.db(id));
  }

  listImplementation () {
    return this.adminDb.listDatabases()
    .then(data => {
      // Get DB objects from names
      return data.databases.map(databaseInfo => this.client.db(databaseInfo.name));
    });
  }

  removeImplementation (item) {
    return item.dropDatabase();
  }
}

export default function init (options) {
  return new DatabaseService(options);
}

init.Service = DatabaseService;
