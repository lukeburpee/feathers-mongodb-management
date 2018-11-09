# feathers-mongodb-management

[![Build Status](https://travis-ci.org/lukeburpee/feathers-mongodb-management.png?branch=master)](https://travis-ci.org/lukeburpee/feathers-mongodb-management)
[![Code Climate](https://codeclimate.com/github/feathersjs/feathers-mongodb-management/badges/gpa.svg)](https://codeclimate.com/github/feathersjs-ecosystem/feathers-mongodb-management)
[![Coverage Status](https://coveralls.io/repos/github/lukeburpee/feathers-mongodb-management/badge.svg?branch=master)](https://coveralls.io/github/lukeburpee/feathers-mongodb-management?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/feathersjs-ecosystem/feathers-mongodb-management/badge.svg)](https://snyk.io/test/github/feathersjs-ecosystem/feathers-mongodb-management)
[![Dependency Status](https://img.shields.io/david/lukeburpee/feathers-mongodb-management.svg?style=flat-square)](https://david-dm.org/lukeburpee/feathers-mongodb-management)
[![Download Status](https://img.shields.io/npm/dm/feathers-mongodb-management.svg?style=flat-square)](https://www.npmjs.com/package/feathers-mongodb-management)

> Feathers service adapters for managing MongoDB databases, users and collections

### Under Development

**This plugin is under development and currently in beta-test, updates will be pushed frequently.
As a consequence it should be considered unstable, not yet ready for production use.
Although we try to avoid this wherever possible, `0.x` versions on the master branch can promote breaking changes in the API.**

## Installation

With NPM `npm install feathers-mongodb-management --save` or Yarn `yarn add feathers-mongodb-management`

## Documentation

If a large number of users require it a more complete feathers-mongodb-management documentation will be created. For now as the API is pretty straigth forward the example and [tests](https://github.com/feathersjs-ecosystem/feathers-mongodb-management/tree/master/test) should be sufficient to understand how it works.

The initial use case was to simplify data segregation for a SaaS application where each user could belong to different organisations like in GitHub. Indeed, one key aspect of access control is to filter the resources a user can reach. In this specific use case the users always work in the context of an organisation acting as a filter applied on the manipulated resources. This issue is often tackled by applying a client-side filter on a global service like `/users?org=orgId` and storing on each resouce the organisation it belongs to. We consider this approach as more harder to maintain in the long-term due to additional filtering and relations in the data model. As a consequence we created this plugin to "physically" separate the data of each organisation in a dedicated DB instead of doing this "logically" using filtering.

You can find more information by reading this [article](https://blog.feathersjs.com/access-control-strategies-with-feathersjs-72452268739d).

## Complete Example

Here's an example of a Feathers server that uses `feathers-mongodb-management`.

```js
const feathers = require('feathers');
const rest = require('feathers-rest');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const errorHandler = require('feathers-errors/handler');
const mongodb = require('mongodb');
const plugin = require('feathers-mongodb-management');

// Initialize the application
const app = feathers()
  .configure(rest())
  .configure(hooks())
  // Needed for parsing bodies (login)
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(errorHandler());

// Connect to Mongo instance
mongodb.connect('mongodb://127.0.0.1:27017/feathers-test')
.then(mongo => {
  // Initialize your feathers plugin to manage databases
  app.use('/mongo/databases', plugin.database({ db: mongo }));
  let dbService = app.service('/mongo/databases');
  // Now create a new database
  dbService.create({ name: 'test-db' })
  .then(db => {
    // The objects provided through the plugin services are just metadata and not MongoDB driver instances
    // We need to retrieve it to create collection/user services that require the DB instance
    db = mongodb.db('test-db');
    // Now create services binded to this database to manage collections/users
    app.use('/mongo/test-db/collections', plugin.collection({ db }));
    let collectionService = app.service('/mongo/test-db/collections');
    app.use('/mongo/test-db/users', plugin.user({ db }));
    let userService = app.service('/mongo/test-db/users');
    // Perform other operations using these services if required
    ...
    // Then start the app
    app.listen(3030);
    console.log('Feathers app started on 127.0.0.1:3030');
  });
});
```

## License

Copyright (c) 2016

Licensed under the [MIT license](LICENSE).
