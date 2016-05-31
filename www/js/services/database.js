
angular.module('diary.services')

.factory('Database', function(Test) {

  var Uta = null;
  var Database = {

    // Initialises the module.
    init: function(uta) {
      Uta = uta;
      return this;
    },

    // Gets default database values.
    defaults: function() {
      var defaults = {
        lastWrittenAt: null,
        lastMigration: _.pick(
          Database.migrations.slice(-1)[0], 'id', 'date', 'version'
        ),
        entries: [ Uta.Entries.examples.welcome ],
        events: {
          completeTutorial: null,
          createPassphrase: null
        },
        settings: {
          firstName: "",
          lastName: "",
          enableDebug: false,
          enableEncryption: false,
          enableTutorial: true
        }
      };
      return defaults;
    },

    // Validates a database object.
    validateDB: function(database) {
      var isObject = _.isObject(database);
      var hasEntries = _.isArray(database.entries);
      var isValid = isObject && hasEntries;
      return isValid;
    },

    // The database migrations as sequence of changes and metadata.
    migrations:
    [
      {
        id: 1,
        date: '2016-03-23',
        version: '0.9.0',
        up: function(db) {
          var initial = {
            lastWrittenAt: null,
            entries: [ Uta.Entries.examples.welcome ],
            settings: {
              username: "",
              password: "",
              email: "",
              firstName: "",
              lastName: "",
              enableEncryption: false
            }
          };
          db = initial;
          return db;
        },
        down: function(db) {
          for (var key in db)
            delete db[key];
          return db;
        }
      },
      {
        id: 2,
        date: '2016-03-23',
        version: '0.9.1',
        up: function(db) {
          db.settings.enableTutorial = true;
          return db;
        },
        down: function(db) {
          delete db.settings.enableTutorial;
          return db;
        }
      },
      {
        id: 3,
        date: '2016-03-24',
        version: '0.9.2',
        up: function(db) {
          db.settings.enableDebug = false;
          return db;
        },
        down: function(db) {
          delete db.settings.enableDebug;
          return db;
        }
      },
      {
        id: 4,
        date: '2016-05-27',
        version: '0.9.3',
        up: function(db) {
          db.events = {
            completeTutorial: null,
            createPassphrase: null
          };
          return db;
        },
        down: function(db) {
          delete db.events;
          return db;
        }
      },
      {
        id: 5,
        date: '2016-05-31',
        version: '0.9.4',
        up: function(db) {
          delete db.settings.username;
          delete db.settings.password;
          delete db.settings.email;
          return db;
        },
        down: function(db) {
          db.settings.username = "";
          db.settings.password = "";
          db.settings.email = "";
          return db;
        }
      }
    ],

    // Migrates a database up to target id.
    migrateUp: function(currentDB, targetID) {
      var db = currentDB || { lastMigration: { id: 0 } };
      var migrations = Database.migrations;
      var lastID = db.lastMigration.id;
      var latestID = migrations.slice(-1)[0].id;
      var isValidTarget = lastID <= targetID && targetID <= latestID;

      if (!isValidTarget)
        throw new Error("Failed migration up: Invalid target");

      for (var i = 0; i < migrations.length; i++) {
        var migration = migrations[i];
        var isRequested = migration.id <= targetID;
        var isApplied = migration.id <= db.lastMigration.id;
        if (isRequested && !isApplied) {
          db = migration.up(db);
          db.lastMigration = {
            id: migration.id,
            date: migration.date,
            version: migration.version
          };
        }
      }
      return db;
    },

    // Migrates a database down to target id.
    migrateDown: function(currentDB, targetID) {
      var db = currentDB;
      var migrations = Database.migrations;
      var lastID = db.lastMigration.id;
      var firstID = migrations[0].id;
      var isValidTarget = targetID <= lastID && targetID >= firstID;

      if (!db)
        throw new Error("Failed migration down: Invalid database");

      if (!isValidTarget)
        throw new Error("Failed migration down: Invalid target");

      for (var i = migrations.length-1; i >= 0; i--) {
        var migration = migrations[i];
        var isRequested = migration.id > targetID;
        var isApplied = migration.id < db.lastMigration.id;
        if (isRequested && !isApplied) {
          db = migration.down(db);
          db.lastMigration = _.pick(migrations[i-1], 'id', 'date', 'version');
        }
      }
      return db;
    },

    testMigrateUp: function() {
      var lastId = Database.migrations.slice(-1)[0].id;
      var db = Database.migrateUp(null, lastId);
      var result1 = _.isEqual(db.entries, Database.defaults().entries);
      var result2 = _.isEqual(db.settings, Database.defaults().settings);
      var result3 = _.isEqual(db.lastWrittenAt, Database.defaults().lastWrittenAt);
      var result4 = _.isEqual(db.events, Database.defaults().events);
      var result5 = _.isEqual(_.pick(db.settings, 'username', 'password', 'email'), {});
      return result1 && result2 && result3 && result4 && result5;
    },

    testMigrateDown: function() {
      var firstId = Database.migrations[0].id;
      var db = Database.migrateDown(Database.defaults(), firstId);
      var result =
        db.lastMigration.id == 1 &&
        db.lastMigration.version == '0.9.0' &&
        db.lastMigration.date == '2016-03-23' &&
        db.lastWrittenAt == null &&
        db.entries[0].text == Uta.Entries.examples.welcome.text &&
        db.settings.username == '' &&
        db.settings.password == '' &&
        db.settings.email == '' &&
        db.settings.firstName == '' &&
        db.settings.lastName == '' &&
        db.settings.enableTutorial == undefined &&
        db.settings.enableEncryption == false;
      return result;
    },

    // Tests database migrations.
    testMigrations: function() {
      var tests = [
        [Database.testMigrateUp, "Should migrate up to latest version"],
        [Database.testMigrateDown, "Should migrate down to initial version"]
      ];
      var module = [tests, "Database Migration"];
      Uta.Test.runModule(module);
    },

    // Test this module.
    test: function() {
      Database.testMigrations();
    }
  };

  return Database;
});
