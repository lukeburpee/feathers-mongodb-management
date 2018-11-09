import databases from './databases';
import collections from './collections';
import users from './users';
import makeDebug from 'debug';

const debug = makeDebug('feathers-mongodb-management');

export default function init () {
  debug('Initializing feathers-mongodb-management');
}

init.databases = databases;
init.collections = collections;
init.users = users;
