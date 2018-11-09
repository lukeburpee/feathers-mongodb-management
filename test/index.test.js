import chai, { util, expect } from 'chai';
import chailint from 'chai-lint';
import feathers from '@feathersjs/feathers';
import errors from '@feathersjs/errors';
import configuration from '@feathersjs/configuration';
import { base } from 'feathers-service-tests';
import mongodb, { ObjectID } from 'mongodb';
import plugin from '../src';
import Service from '../src/service';
import { _ } from '@feathersjs/commons';
import makeDebug from 'debug';

const debug = makeDebug('feathers-mongodb-management:tests');

describe('feathers-mongodb-management', () => {
  let app,
    client, 
    db, 
    adminDb, 
    testDb,
    testUserId, 
    testUser,
    testNoCommandUserId,
    testNoCommandUser,
    createUserResponse, 
    databaseService, 
    collectionService, 
    userService,
    userServiceWithMatcher,
    userServiceNoInfoCommand;

  before(() => {
    chailint(chai, util);
    app = feathers();
    // Load app configuration first
    app.configure(configuration());
    return mongodb.connect(app.get('db').url, app.get('db').defaultOptions)
    .then(mongo => {
      client = mongo
      db = mongo.db(app.get('db').dbName);
      adminDb = db.admin();

      testUserId = 'test-user'

      testUser = {
        name: 'test-user',
        password: 'test-password',
        roles: [ 'readWrite' ]
      }
      app.use('/databases', plugin.databases({
        dbName: app.get('db').dbName,
        client: client
      }));
      app.use('/collections', plugin.collections({
        db: db
      }));
      app.use('/users', plugin.users({
        db: db
      }));
      db.createCollection('remove-collection');
    });
  });

  it('is CommonJS compatible', () => {
    expect(typeof plugin).to.equal('function');
  });

  it('registers the plugin', () => {
    app.configure(plugin);
  });

  describe('Base Service', () => {
    describe('Initialization', () => {
      describe('When mission options', () => {
        it('throws an error', () => {
          expect(Service.bind(null)).to.throw('MongoDB management services require options')
        });
      });
    });
  });

  describe('Database Plugin', () => {
    describe('Initialization', () => {

      describe('When missing client option', () => {
        it('throws an error', () => {
          expect(() => plugin.databases({dbName: app.get('db').dbName})).to.throw('MongoDB client must be provided')
        });
      });

      describe('When missing database name option', () => {
        it('throws an error', () => {
          expect(() => plugin.databases({ client: client })).to.throw('MongoDB database name must be provided')
        });
      });
    });
    describe('Utilities', () => {
      describe('checkAdminStatus', () => {
        it('sets database service adminStatus to true if connected to admin database', () => {
          expect(app.service('databases').adminStatus).to.be.true
        });
        it('throws error if database service admin database is null', () => {
          expect(() => app.service('databases').checkAdminDb(null))
          .to.throw('MongoDB admin cannot be retrieved, ensure the connection user has correct privileges')
        });
      });
    });
    describe('createImplementation', () => {
      it('creates a database', () => {
        return app.service('databases').create({
          name: 'test-db'
        })
        .then(db => {
          debug(db);
          testDb = client.db('test-db');
          expect(testDb).toExist();
          return adminDb.listDatabases();
        });
      });
    });
    describe('getImplementation', () => {
      it('gets a database by name', () => {
        app.service('databases').get('test-db')
        .then(db => {
          debug(db);
          expect(db).to.equal(testDb)
        });
      });
    });
    describe('findImplementation', () => {
      it('finds databases', () => {
        app.service('databases').find({
          query: { $select: ['name', 'collections'] }
        })
        .then(serviceDbs => {
          debug(serviceDbs);
          adminDb.listDatabases()
          .then(dbsInfo => {
            expect(serviceDbs.length).to.equal(dbsInfo.databases.length);
            serviceDbs.forEach(db => expect(db.collections).toExist());
            // Provided by default if no $select
            serviceDbs.forEach(db => expect(db.objects).beUndefined());
          });
        });
      });
    });
    describe('removeImplementation', () => {
      it('removes a database', () => {
        app.service('databases').remove('test-db')
          .then(removedDb => {
            debug(removedDb);
            adminDb.listDatabases({ nameOnly: true })
            .then(results => {
              expect(results.databases.map(database => database.name).indexOf('test-db')).to.equal(-1);
          });
        });
      });
    });
  });

  describe('Collection Plugin', () => {
    describe('Initialization', () => {
      describe('When missing database option', () => {
        it('throws an error', () => {
          expect(() => app.use('error-collections', plugin.collections({
            id: '_id'
          })))
          .to.throw('Collection database must be provided');
        });
      });
    });

    describe('createImplementation', () => {
      it('creates a single collection', () => {
        return app.service('collections').create({
          name: 'test-collection'
        })
        .then(collection => {
          debug(collection);
          // Need to use strict mode to ensure the delete operation has been taken into account
          return db.listCollections({}, {nameOnly: true})
            .toArray()
            .then(collections => {
              expect(collections.map(collection => collection.name))
              .to.include('test-collection');
            });
        });
      });

      it('creates multiple collections', () => {
        return app.service('collections').create(
          [{name: 'test-list-collection-one'}, {name: 'test-list-collection-two'}]
        )
        .then(() => {
          return db.listCollections({}, {nameOnly: true})
          .toArray()
          .then(collections => {
            expect(collections.map(collection => collection.name))
              .to.include.all.members(['test-list-collection-one', 'test-list-collection-two']);
          });
        });
      });
    });
    describe('findImplementation', () => {
      it('finds collections', () => {
        return app.service('collections').find({
          query: { $select: ['name', 'count'] }
        })
        .then(serviceCollections => {
          serviceCollections.forEach(collection => expect(collection.count).to.equal(0));
          expect(serviceCollections.map(collection => collection.name)).to.include.all.members(['test-collection', 'test-list-collection-one', 'test-list-collection-two'])
        });
      });
    });
    describe('getImplementation', () => {});
    describe('removeImplementation', () => {
      it('removes a single collection', () => {
        return app.service('collections').remove('remove-collection')
        .then(collection => {
          debug(collection);
          return db.listCollections({}, { nameOnly: true })
            .toArray()
            .then(collections => {
              expect(collections.map(collection => collection.name)).to.not.include('remove-collection');
            });
        });
      });
    });
  });

  describe('User Plugin', () => {
    describe('Initialization', () => {
      describe('When missing database option', () => {
        it('throws an error', () => {
          expect(() => app.use('error-users', plugin.users({
          }))).to.throw('MongoDB database must be provided');
        });
      });
    });
    describe('createImplementation', () => {
      it('creates a single user', () => {
        return app.service('users').create(testUser)
        .then(serviceUser => {
          debug(serviceUser);
          db.command({ usersInfo: 'test-user' })
          .then(response => {
            expect(response.users[0].user).to.equal(testUserId);
          });
        });
      });
      describe('When options missing password', () => {
        it('throws an error', () => {
          return app.service('users').create({
            name: 'error-user',
            roles: ['readWrite']
          })
          .catch(err => {
            expect(err).toExist()
          });
        });
      });
    });
    describe('getImplementation', () => {
      it('gets a user', () => {
        return app.service('users').get(testUserId)
        .then(user => {
          expect(user).toExist()
        });
      });
    });
    describe('findImplementation', () => {
      it('finds users without query', () => {
        return app.service('users').find()
        .then(serviceUsers => {
          debug(serviceUsers);
          db.command({ usersInfo: 1 })
          .then(data => {
            expect(serviceUsers.length).to.equal(data.users.length);
            serviceUsers.forEach(user => expect(user.name).toExist());
          });
        });
      });
      it('finds users with query', () => {
        return app.service('users').find({
          query: { $select: ['name', 'roles'] }
        })
        .then(serviceUsers => {
          debug(serviceUsers);
          db.command({ usersInfo: 1 })
          .then(data => {
            expect(serviceUsers.length).to.equal(data.users.length);
            serviceUsers.forEach(user => expect(user.name).toExist());
            // Provided by default if no $select
            serviceUsers.forEach(user => expect(user.db).beUndefined());
          });
        });
      });
    });
    describe('removeImplementation', () => {
      it('removes a user', () => {
        return app.service('users').remove(testUserId)
        .then(serviceUser => {
          debug(serviceUser);
          db.command({ usersInfo: testUserId })
          .catch((err, user) => {
            expect(err).toExist();
          });
        });
      });
    });
  });

  // Cleanup
  after(() => {
    setTimeout(() => {
      client.close()
    }, 3000)
  });
});
