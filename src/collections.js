import { Service } from './service';

// Create the service.
class CollectionService extends Service {
  constructor (options) {
    super(options);

    if (!options.db) {
      throw new Error('Collection database must be provided');
    }
    this.id = options.id || 'name';
    this.events = options.events || [];
    this.paginate = options.paginate || {};
    this.db = options.db;
  }

  // Helper function to process stats object
  processObjectInfos (infos) {
    // In Mongo the collection name key is ns and prefixed by the db name, change to the more intuitive name just as in create
    const namespace = infos.ns.split('.');
    if (namespace.length > 1) {
      infos.name = namespace[1];
    }
    delete infos.ns;
    return infos;
  }

  createImplementation (id, options) {
    return this.db.createCollection(id, options);
  }

  getImplementation (id, params) {
    return Promise.resolve(this.db.collection(id));
  }

  listImplementation () {
    return this.db.collections();
  }

  removeImplementation (item) {
    return item.drop();
  }
}

export default function init (options) {
  return new CollectionService(options);
}

init.Service = CollectionService;
