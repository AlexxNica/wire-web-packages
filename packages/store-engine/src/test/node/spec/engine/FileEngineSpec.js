/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

const fs = require('fs-extra');
const path = require('path');
const {StoreEngine} = require('@wireapp/store-engine');

describe('StoreEngine.FileEngine', () => {
  const DATABASE_NAME = 'database-name';
  const TABLE_NAME = 'the-simpsons';

  const TEST_DIRECTORY = path.join(process.cwd(), '.tmp', DATABASE_NAME);
  let engine = undefined;

  beforeEach(() => (engine = new StoreEngine.FileEngine(TEST_DIRECTORY)));

  afterEach(done =>
    fs
      .remove(TEST_DIRECTORY)
      .then(done)
      .catch(done.fail)
  );

  describe('"resolvePath"', () => {
    it('properly validate paths', done => {
      const PRIMARY_KEY = 'primary-key';

      Promise.all([
        engine.resolvePath('../etc', PRIMARY_KEY).catch(error => error),
        engine.resolvePath('..\\etc', PRIMARY_KEY).catch(error => error),
        engine.resolvePath('.etc', PRIMARY_KEY).catch(error => error),
        engine.resolvePath(TABLE_NAME, '../etc').catch(error => error),
        engine.resolvePath(TABLE_NAME, '..\\etc').catch(error => error),
        engine.resolvePath(TABLE_NAME, '.etc').catch(error => error),
      ]).then(results => {
        for (error of results) {
          expect(error.name === 'PathValidationError').toBe(true);
          expect(error.message).toBe(StoreEngine.error.PathValidationError.TYPE.PATH_TRAVERSAL);
        }
        done();
      });
    });
  });

  describe('"create"', () => {
    it('creates a serialized database record.', done => {
      const PRIMARY_KEY = 'primary-key';

      const entity = {
        some: 'value',
      };

      engine
        .create(TABLE_NAME, PRIMARY_KEY, entity)
        .then(primaryKey => {
          expect(primaryKey).toEqual(PRIMARY_KEY);
          done();
        })
        .catch(done.fail);
    });

    it("doesn't save empty values.", done => {
      const PRIMARY_KEY = 'primary-key';

      const entity = undefined;

      engine
        .create(TABLE_NAME, PRIMARY_KEY, entity)
        .then(() => done.fail(new Error('Method is supposed to throw an error.')))
        .catch(error => {
          expect(error).toEqual(jasmine.any(StoreEngine.error.RecordTypeError));
          done();
        });
    });

    it('throws an error when attempting to overwrite a record.', done => {
      const PRIMARY_KEY = 'primary-key';

      const firstEntity = {
        some: 'value',
      };

      const secondEntity = {
        some: 'newer-value',
      };

      engine
        .create(TABLE_NAME, PRIMARY_KEY, firstEntity)
        .then(() => engine.create(TABLE_NAME, PRIMARY_KEY, secondEntity))
        .catch(error => {
          expect(error).toEqual(jasmine.any(StoreEngine.error.RecordAlreadyExistsError));
          done();
        });
    });

    it('does not allow path traversal', done => {
      const PRIMARY_KEY = 'primary-key';

      const entity = {
        some: 'value',
      };

      Promise.all([
        engine.create('../etc', PRIMARY_KEY, entity).catch(error => error),
        engine.create('..\\etc', PRIMARY_KEY, entity).catch(error => error),
        engine.create('.etc', PRIMARY_KEY, entity).catch(error => error),
        engine.create(TABLE_NAME, '../etc', entity).catch(error => error),
        engine.create(TABLE_NAME, '..\\etc', entity).catch(error => error),
        engine.create(TABLE_NAME, '.etc', entity).catch(error => error),
      ]).then(results => {
        for (error of results) {
          expect(error.name === 'PathValidationError').toBe(true);
          expect(error.message).toBe(StoreEngine.error.PathValidationError.TYPE.PATH_TRAVERSAL);
        }
        done();
      });
    });

    it('does not work when non-printable characters are being used in the store name', done => {
      engine = new StoreEngine.FileEngine(path.join(process.cwd(), '.tmp', 'wrong\t'));

      const PRIMARY_KEY = 'primary-key';

      const entity = {
        some: 'value',
      };

      engine
        .create(TABLE_NAME, PRIMARY_KEY, entity)
        .then(() => done.fail(new Error('Method is supposed to throw an error.')))
        .catch(error => {
          expect(error.name).toBe(StoreEngine.error.PathValidationError.name);
          expect(error.message).toBe(StoreEngine.error.PathValidationError.TYPE.INVALID_NAME);
          done();
        });
    });
  });

  describe('"delete"', () => {
    it('returns the primary key of a deleted record.', done => {
      const PRIMARY_KEY = 'primary-key';

      const entity = {
        some: 'value',
      };

      engine
        .create(TABLE_NAME, PRIMARY_KEY, entity)
        .then(primaryKey => engine.delete(TABLE_NAME, primaryKey))
        .then(primaryKey => {
          expect(primaryKey).toBe(PRIMARY_KEY);
          done();
        });
    });

    it('deletes a record.', done => {
      const homer = {
        entity: {
          firstName: 'Homer',
          lastName: 'Simpson',
        },
        primaryKey: 'homer-simpson',
      };

      const lisa = {
        entity: {
          firstName: 'Lisa',
          lastName: 'Simpson',
        },
        primaryKey: 'lisa-simpson',
      };

      const marge = {
        entity: {
          firstName: 'Marge',
          lastName: 'Simpson',
        },
        primaryKey: 'marge-simpson',
      };

      const expectedRemainingEntities = 2;

      Promise.all([
        engine.create(TABLE_NAME, homer.primaryKey, homer.entity),
        engine.create(TABLE_NAME, lisa.primaryKey, lisa.entity),
        engine.create(TABLE_NAME, marge.primaryKey, marge.entity),
      ])
        .then(() => engine.delete(TABLE_NAME, lisa.primaryKey))
        .then(() => engine.readAllPrimaryKeys(TABLE_NAME))
        .then(primaryKeys => {
          expect(primaryKeys.length).toBe(expectedRemainingEntities);
          expect(primaryKeys[0]).toBe(homer.primaryKey);
          expect(primaryKeys[1]).toBe(marge.primaryKey);
          done();
        });
    });

    it('does not allow path traversal', done => {
      const PRIMARY_KEY = 'primary-key';

      Promise.all([
        engine.delete('../etc', PRIMARY_KEY).catch(error => error),
        engine.delete('..\\etc', PRIMARY_KEY).catch(error => error),
        engine.delete('.etc', PRIMARY_KEY).catch(error => error),
        engine.delete(TABLE_NAME, '../etc').catch(error => error),
        engine.delete(TABLE_NAME, '..\\etc').catch(error => error),
        engine.delete(TABLE_NAME, '.etc').catch(error => error),
      ]).then(results => {
        for (error of results) {
          expect(error.name === 'PathValidationError').toBe(true);
          expect(error.message).toBe(StoreEngine.error.PathValidationError.TYPE.PATH_TRAVERSAL);
        }
        done();
      });
    });
  });

  describe('"deleteAll"', () => {
    it('deletes all records from a database table.', done => {
      const homer = {
        entity: {
          firstName: 'Homer',
          lastName: 'Simpson',
        },
        primaryKey: 'homer-simpson',
      };

      const lisa = {
        entity: {
          firstName: 'Lisa',
          lastName: 'Simpson',
        },
        primaryKey: 'lisa-simpson',
      };

      const marge = {
        entity: {
          firstName: 'Marge',
          lastName: 'Simpson',
        },
        primaryKey: 'marge-simpson',
      };

      Promise.all([
        engine.create(TABLE_NAME, homer.primaryKey, homer.entity),
        engine.create(TABLE_NAME, lisa.primaryKey, lisa.entity),
        engine.create(TABLE_NAME, marge.primaryKey, marge.entity),
      ])
        .then(() => engine.deleteAll(TABLE_NAME))
        .then(hasBeenDeleted => {
          expect(hasBeenDeleted).toBe(true);
          return engine.readAllPrimaryKeys(TABLE_NAME);
        })
        .then(primaryKeys => {
          expect(primaryKeys.length).toBe(0);
          done();
        });
    });

    it('does not allow path traversal', done => {
      Promise.all([
        engine.deleteAll('../etc').catch(error => error),
        engine.deleteAll('..\\etc').catch(error => error),
        engine.deleteAll('.etc').catch(error => error),
      ]).then(results => {
        for (error of results) {
          expect(error.name === 'PathValidationError').toBe(true);
          expect(error.message).toBe(StoreEngine.error.PathValidationError.TYPE.PATH_TRAVERSAL);
        }
        done();
      });
    });
  });

  describe('"read"', () => {
    it('returns a database record.', done => {
      const PRIMARY_KEY = 'primary-key';

      const entity = {
        some: 'value',
      };

      engine.create(TABLE_NAME, PRIMARY_KEY, entity).then(primaryKey =>
        engine
          .read(TABLE_NAME, primaryKey)
          .then(record => {
            expect(record.some).toBe(entity.some);
            done();
          })
          .catch(error => done.fail(error))
      );
    });

    it('throws an error if a record cannot be found.', done => {
      const PRIMARY_KEY = 'primary-key';

      engine
        .read(TABLE_NAME, PRIMARY_KEY)
        .then(() => done.fail(new Error('Method is supposed to throw an error.')))
        .catch(error => {
          expect(error).toEqual(jasmine.any(StoreEngine.error.RecordNotFoundError));
          done();
        });
    });

    it('does not allow path traversal', done => {
      const PRIMARY_KEY = 'primary-key';

      Promise.all([
        engine.read('../etc', PRIMARY_KEY).catch(error => error),
        engine.read('..\\etc', PRIMARY_KEY).catch(error => error),
        engine.read('.etc', PRIMARY_KEY).catch(error => error),
        engine.read(TABLE_NAME, '../etc').catch(error => error),
        engine.read(TABLE_NAME, '..\\etc').catch(error => error),
        engine.read(TABLE_NAME, '.etc').catch(error => error),
      ]).then(results => {
        for (error of results) {
          expect(error.name === 'PathValidationError').toBe(true);
          expect(error.message).toBe(StoreEngine.error.PathValidationError.TYPE.PATH_TRAVERSAL);
        }
        done();
      });
    });
  });

  describe('"readAll"', () => {
    it('returns multiple database records.', done => {
      const homer = {
        entity: {
          firstName: 'Homer',
          lastName: 'Simpson',
        },
        primaryKey: 'homer-simpson',
      };

      const lisa = {
        entity: {
          firstName: 'Lisa',
          lastName: 'Simpson',
        },
        primaryKey: 'lisa-simpson',
      };

      const marge = {
        entity: {
          firstName: 'Marge',
          lastName: 'Simpson',
        },
        primaryKey: 'marge-simpson',
      };

      const allEntities = [homer, lisa, marge];

      Promise.all([
        engine.create(TABLE_NAME, homer.primaryKey, homer.entity),
        engine.create(TABLE_NAME, lisa.primaryKey, lisa.entity),
        engine.create(TABLE_NAME, marge.primaryKey, marge.entity),
      ])
        .then(() => engine.readAll(TABLE_NAME))
        .then(records => {
          expect(records.length).toBe(allEntities.length);
          for (const counter in records) {
            expect(records[counter].firstName).toBe(allEntities[counter].entity.firstName);
          }
          done();
        });
    });

    it('does not allow path traversal', done => {
      Promise.all([
        engine.readAll('../etc').catch(error => error),
        engine.readAll('..\\etc').catch(error => error),
        engine.readAll('.etc').catch(error => error),
      ]).then(results => {
        for (error of results) {
          expect(error.name === 'PathValidationError').toBe(true);
          expect(error.message).toBe(StoreEngine.error.PathValidationError.TYPE.PATH_TRAVERSAL);
        }
        done();
      });
    });
  });

  describe('"readAllPrimaryKeys"', () => {
    it('gets the primary keys of all records in a table.', done => {
      const homer = {
        entity: {
          firstName: 'Homer',
          lastName: 'Simpson',
        },
        primaryKey: 'homer-simpson',
      };

      const lisa = {
        entity: {
          firstName: 'Lisa',
          lastName: 'Simpson',
        },
        primaryKey: 'lisa-simpson',
      };

      const marge = {
        entity: {
          firstName: 'Marge',
          lastName: 'Simpson',
        },
        primaryKey: 'marge-simpson',
      };

      const allEntities = [homer, lisa, marge];

      Promise.all([
        engine.create(TABLE_NAME, homer.primaryKey, homer.entity),
        engine.create(TABLE_NAME, lisa.primaryKey, lisa.entity),
        engine.create(TABLE_NAME, marge.primaryKey, marge.entity),
      ])
        .then(() => engine.readAllPrimaryKeys(TABLE_NAME))
        .then(primaryKeys => {
          expect(primaryKeys.length).toBe(allEntities.length);
          for (const counter in allEntities) {
            expect(primaryKeys[counter]).toBe(allEntities[counter].primaryKey);
          }
          done();
        });
    });
  });

  describe('"update"', () => {
    it('updates an existing database record.', done => {
      const PRIMARY_KEY = 'primary-key';

      const entity = {
        name: 'Old monitor',
      };

      const updates = {
        age: 177,
        size: {
          height: 1080,
          width: 1920,
        },
      };

      const expectedAmountOfProperties = 2;

      engine
        .create(TABLE_NAME, PRIMARY_KEY, entity)
        .then(() => engine.update(TABLE_NAME, PRIMARY_KEY, updates))
        .then(primaryKey => engine.read(TABLE_NAME, primaryKey))
        .then(updatedRecord => {
          expect(updatedRecord.name).toBe(entity.name);
          expect(updatedRecord.age).toBe(updates.age);
          expect(Object.keys(updatedRecord.size).length).toBe(expectedAmountOfProperties);
          expect(updatedRecord.size.height).toBe(updates.size.height);
          expect(updatedRecord.size.width).toBe(updates.size.width);
          done();
        })
        .catch(done.fail);
    });
  });
});
