import errors from '@feathersjs/errors';
import { filterQuery as filter, sorter, select, _ } from '@feathersjs/commons';
import sift from 'sift';
// Create the base service.
class Service {
  constructor (options) {
    if (!options) {
      throw new Error('MongoDB management services require options');
    }
    this.id = options.id || '_id';
    this.events = options.events || [];
    this.paginate = options.paginate || {};
    this._matcher = options.matcher;
    this._sorter = options.sorter || sorter;
  }

  get (id, params) {
    return this.getImplementation(id);
  }

  // Find without hooks and mixins that can be used internally and always returns
  // a pagination object
  _find (params) {
    const { query, filters } = filter(params.query ? params.query : {});

    // first get all items
    return this.listImplementation()
    .then(items => {
      let infosPromises = items.map(item => {
        // Then get stats/infos for all items if possible
        if (typeof item.stats === 'function') {
          return item.stats();
        } else {
          return Promise.resolve(item);
        }
      });
      return Promise.all(infosPromises);
    })
    .then(infos => {
      _.each(infos, this.processObjectInfos);
      let values = _.values(infos);

      if (this._matcher) {
        values = values.filter(this._matcher(query));
      } else {
        values = sift(query, values);
      }
      const total = values.length;

      if (filters) {
        if (filters.$sort) {
          values.sort(this._sorter(filters.$sort));
        }

        if (filters.$skip) {
          values = values.slice(filters.$skip);
        }

        if (typeof filters.$limit !== 'undefined') {
          values = values.slice(0, filters.$limit);
        }

        if (filters.$select) {
          values = values.map(value => _.pick(value, ...filters.$select));
        }
      }

      return {
        total,
        limit: filters.$limit,
        skip: filters.$skip || 0,
        data: values
      };
    });
  }

  find (params) {
    const paginate = typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
    // Call the internal find with query parameter that include pagination
    const result = this._find(params, query => filter(query, paginate));

    if (!(paginate && paginate.default)) {
      return result.then(page => page.data);
    }

    return result;
  }

  // Create without hooks and mixins that can be used internally
  _create (data, params) {
    let name = data.name;
    if (!name) {
      return Promise.reject(new errors.BadRequest('Missing required name to create a collection'));
    }

    // The driver complies about valid options
    delete data.name;
    return Promise.resolve(this.createImplementation(name, data))
    .then(select(params));
  }

  create (data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this._create(current)));
    }

    return this._create(data, params);
  }

  // Remove without hooks and mixins that can be used internally
  _remove (idOrInfos, params) {
    let itemPromise;
    if (_.isObject(idOrInfos)) {
      itemPromise = this.getImplementation(idOrInfos._id);
    } else {
      itemPromise = this.getImplementation(idOrInfos);
    }
    return itemPromise.then(item => {
      if (item) {
        return this.removeImplementation(item)
        .then(() => {
          if (_.isObject(idOrInfos)) {
            return idOrInfos;
          } else {
            return { name: idOrInfos };
          }
        });
      }

      if (_.isObject(idOrInfos)) {
        return Promise.reject(
          new errors.NotFound(`No record found for id '${idOrInfos._id}'`)
        );
      } else {
        return Promise.reject(
          new errors.NotFound(`No record found for id '${idOrInfos}'`)
        );
      }
    });
  }

  remove (id, params) {
    if (id === null) {
      return this._find(params)
      .then(page =>
        Promise.all(page.data.map(current =>
          this._remove(current, params)
          .then(select(params))
        ))
      );
    }

    return this._remove(id, params);
  }

  /* NOT IMPLEMENTED
  patch (id, data, params) {

  }

  update (id, data, params) {

  }
  */
}

export default function init (options) {
  return new Service(options);
}

export {
  Service
};
