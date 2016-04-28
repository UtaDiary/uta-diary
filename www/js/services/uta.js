
angular.module('diary.services')

.factory('KeyRing', function() {

  var Uta = null;

  /**
   * The KeyRing class holds a user's secret keys,
   * allowing for cryptographic operations after entering
   * their passphrase once each time the app is started.
   *
   * This sensitive information is stored only in memory,
   * rather than persisted to the filesystem with other data.
   *
   * Example:
   *
   *    // Create a new key ring
   *    KeyRing.create(passphrase, salt).then(
   *      function(keyRing) {
   *        var pass          = keyRing.passphrase;
   *        var salt          = keyRing.salt;
   *        var parentKey     = keyRing.keys.parentKey;
   *        var encryptionKey = keyRing.keys.encryptionKey;
   *        var signingKey    = keyRing.keys.signingKey;
   *      }
   *    );
   *
   */
  var KeyRing = function() {};

  // Creates a new key ring from passphrase and salt.
  KeyRing.create = function(passphrase, salt) {
    var keyRing = new KeyRing();
    var promise = keyRing.configure(passphrase, salt);
    return promise;
  };

  KeyRing.prototype = {

    constructor: KeyRing,
    passphrase: null,
    salt: null,
    keys: null,

    // Configures this key ring with passphrase and salt.
    configure: function(passphrase, salt) {
      var q = $q.defer();
      var self = this;

      Crypto.deriveKeys(passphrase, salt, function(err, keys) {
        if (err) return q.reject(err);

        self.passphrase = passphrase;
        self.salt = salt;
        self.keys = keys;

        return q.resolve(self);
      });
      return q.promise;
    }
  };

  // Initialises the module.
  KeyRing.init = function(uta) {
    Uta = uta;
    return this;
  };

  return KeyRing;
})

.factory('Uta', function($cordovaFile, Backups, Crypto, Database, Entries, FileUtils, KeyRing, Test, Vault) {

  var Uta = {

    // The Uta Diary database.
    db: {},

    // Gets the directory for application data.
    getDataDirectory: function() {
      if (ionic.Platform.isAndroid()) {
        return cordova.file.dataDirectory;
      }
    },

    // Gets root of the directory for backups.
    getBackupRoot: function() {
      if (ionic.Platform.isAndroid()) {
        return cordova.file.externalRootDirectory;
      }
    },

    // Gets parent of the directory for backups.
    getBackupParent: function() {
      return Uta.getBackupRoot() + 'UtaDiary/';
    },

    // Gets the directory for database backups.
    getBackupDirectory: function() {
      return Uta.getBackupParent() + 'backups/';
    },

    // Lists all available backup files by name.
    listBackupFiles: function(callback) {
      var backupDir = Uta.getBackupDirectory();
      FileUtils.listDir(backupDir, function(err, entries) {
        if (err) {
          console.error("Error listing backups: ", backups);
          return callback([]);
        }
        else {
          var files = entries.map(function(entry) {return entry.name});
          return callback(files);
        }
      });
    },

    // Loads database from a vault.
    loadVault: function(vault, callback) {
      var passphrase = Uta.keyRing.passphrase;
      vault.retrieve(passphrase)
      .then(
        function(data) {
          Uta.importDB(data, callback);
        }
      )
      .catch(
        function(err) {
          return callback(new Error("Failed loading vault: " + err.message));
        }
      );
    },

    // Saves database to a vault.
    saveVault: function(path, filename, callback) {
      var passphrase = Uta.keyRing.passphrase;
      var data = Uta.db;
      var vault = new Vault();
      vault.store(passphrase, data)
      .then(
        function() {
          return Uta.createBackupDirs();
        }
      )
      .then(
        function() {
          var json = vault.serialize();
          return FileUtils.writeFile(path, filename, json, true, function(err) {
            if (err)
              return callback(new Error("Failed saving vault: " + err.message));
            else
              return callback(null);
          });
        }
      )
      .catch(
        function(err) {
          return callback(new Error("Failed saving vault: " + err.message));
        }
      );
    },

    // Loads JSON for database or vault.
    loadJSON: function(json, callback) {
      var data = angular.fromJson(json);
      var isVault = data.vault ? true : false;

      if (isVault) {
        var vault = new Vault();
        vault.deserialize(json);
        Uta.loadVault(vault, callback);
      }
      else {
        Uta.importDB(data, callback);
      }
    },

    // Imports a database object.
    importDB: function(database, callback) {
      console.log("Importing database: " + JSON.stringify(database, null, '  '));

      var isValid = Database.validateDB(database);
      if (isValid) {
        Uta.db = database;
        return Entries.commit(callback);
      }
      else {
        return callback(new Error("Invalid database"));
      }
    },

    // Imports a database file.
    importFile: function(path, file, callback) {
      console.log("Importing file: " + file);

      $cordovaFile.readAsText(path, file).then(
      function(json) {
        console.log("Imported JSON: " + json);

        Uta.loadJSON(json, function(err) {
          if (err)
            return callback(new Error("Error importing file: " + err.message));
          else
            return callback(null);
        });
      },
      function(error) {
        return callback(new Error("Error reading file: " + JSON.stringify(error, null, '  ')));
      });
    },

    createBackupDirs: function() {
      var q = $q.defer();
      console.log("Creating backup directories");
      $cordovaFile.createDir(Uta.getBackupRoot(), 'UtaDiary', true)
      .then(
        function(success) {
          return $cordovaFile.createDir(Uta.getBackupParent(), 'backups', true)
        }
      )
      .then(
        function() {
          return q.resolve();
        }
      )
      .catch(
        function(error) {
          return q.reject(new Error("Error creating backup directories: " + error.message));
        }
      );
      return q.promise;
    },

    // Exports database to file.
    exportFile: function(path, file, callback) {
      console.log("Exporting file: " + file);
      Uta.createBackupDirs()
      .then(
        function() {
          var data = angular.toJson(Uta.db);
          return FileUtils.writeFile(path, file, data, true, callback);
        }
      )
      .catch(
        function(error) {
          return callback(new Error("Failed exporting file: " + error.message));
        }
      );
    },

    // Deletes a given file.
    deleteFile: function(path, file, callback) {
      console.log("Deleting file: " + file);
      $cordovaFile.removeFile(path, file).then(
        function(success) {
          return callback(null);
        },
        function(error) {
          return callback(new Error("Error deleting file: " + JSON.stringify(error)));
        }
      );
    },

    // Commits database.
    commit: function(callback) {
      return Uta.Entries.commit(callback);
    },

    // Migrates database up to latest version.
    migrateUp: function(callback) {
      var lastMigration = Uta.db.lastMigration;
      var latestMigration = Uta.Database.migrations.slice(-1)[0];

      console.log("Current database version: " + lastMigration.version);

      if (lastMigration.id < latestMigration.id) {
        console.log("Upgrading database to version: " + latestMigration.version);
        Uta.Database.migrateUp(Uta.db, latestMigration.id);
        return Uta.commit(callback);
      }
      else {
        console.log("Database is up-to-date");
        return callback(null);
      }
    }
  };

  Uta.Backups = Backups.init(Uta);
  Uta.Crypto = Crypto.init(Uta);
  Uta.Entries = Entries.init(Uta);
  Uta.Database = Database.init(Uta);
  Uta.KeyRing = KeyRing.init(Uta);
  Uta.Test = Test.init(Uta);
  Uta.Vault = Vault.init(Uta);

  window.Uta = Uta;
  return Uta;
});
