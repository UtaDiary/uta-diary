
angular.module('nikki.services')

.factory('Entries', function($cordovaFile) {

  var db = {};

  // Example entries
  var examples = {
    welcome: {
      id: 0,
      author: 'Kitsune',
      date: new Date(2015, 06, 17),
      title: 'Welcome!',
      text: "Thanks for using Uta Nikki!\n\nHopefully, these notes will help you get started."
    },
    first: {
      id: 1,
      author: null,
      date: new Date(2015, 06, 02),
      title: 'Looking Forward',
      text: "A few notes to myself on where I'd like to go."
    },
    second: {
      id: 2,
      author: null,
      date: new Date(2015, 06, 01),
      title: 'A New Journal',
      text: "It's nice to start fresh every once in a while!"
    }
  };

  var Entries = {

    // Example entries.
    examples: examples,

    // Gets database object.
    db: function() {
      return db;
    },

    // Gets the directory for application data.
    getDataDirectory: function() {
      if (ionic.Platform.isAndroid()) {
        return cordova.file.dataDirectory;
      }
    },

    // Gets root of the directory for backups.
    getBackupRoot: function() {
      if (ionic.Platform.isAndroid()) {
        return cordova.file.dataDirectory;
      }
    },

    // Gets parent of the directory for backups.
    getBackupParent: function() {
      return Entries.getBackupRoot() + 'UtaDiary/';
    },

    // Gets the directory for database backups.
    getBackupDirectory: function() {
      return Entries.getBackupParent() + 'backups/';
    },

    // Lists files within a directory.
    listDir: function(path, callback) {

      window.resolveLocalFileSystemURL(path,
      function (fileSystem) {

        var reader = fileSystem.createReader();

        reader.readEntries(
        function (entries) {
          console.log("Read entries: " + JSON.stringify(entries, null, 2));
          return callback(null, entries);
        },
        function (err) {
          console.error("Error reading directory entries: " + err.message);
          return callback(err);
        });
      },
      function (err) {
        console.error("Error listing directory: " + err.message);
        return callback(err);
      });
    },

    // Lists all available backup files by name.
    listBackupFiles: function(callback) {
      var backupDir = Entries.getBackupDirectory();
      Entries.listDir(backupDir, function(err, entries) {
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

    // Imports a database object.
    importDB: function(database, callback) {
      var isValid = Entries.validateDB(database);
      if (isValid) {
        db = database;
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
      function(success) {
        var json = success;
        var imported = angular.fromJson(json);
        console.log("Imported JSON: " + json);
        console.log("Imported object: " + JSON.stringify(imported, null, 2));

        Entries.importDB(imported, function(err) {
          if (err)
            return callback(new Error("Error importing database: " + err.message));
          else
            return callback(null);
        });
      },
      function(error) {
        return callback(new Error("Error reading file: " + JSON.stringify(error, null, 2)));
      });
    },

    // Exports database to file.
    exportFile: function(path, file, callback) {
      console.log("Exporting file: " + file);

      $cordovaFile.createDir(path, 'UtaDiary', true).then(
      function(success) {

        var data = angular.toJson(db);

        $cordovaFile.writeFile(path, file, data, true).then(
        function(success) {
          return callback(null);
        },
        function(error) {
          return callback(new Error("Error reading file: " + JSON.stringify(error, null, 2)));
        });
      },
      function(error) {
        return callback(new Error("Error creating parent directory: " + error.message));
      });
    },

    // Validates a database object.
    validateDB: function(database) {
      var isObject = _.isObject(database);
      var hasEntries = _.isArray(database.entries);
      var isValid = isObject && hasEntries;
      return isValid;
    },

    // Gets default database values.
    defaults: function() {
      var defaults = {
        lastWrittenAt: null,
        entries: [ examples.welcome ],
        settings: {
          username: "",
          password: "",
          email: "",
          firstName: "",
          lastName: "",
          enableEncryption: true
        }
      };
      return defaults;
    },

    // Resets entries database.
    reset: function(callback) {
      console.log("Resetting database...");
      db = Entries.defaults();
      Entries.commit(callback);
    },

    // Starts entries database.
    start: function(callback) {
      console.log("Starting database");

      ionic.Platform.ready(function() {
        if (!window.cordova) {
          console.log("Checking for entries in localStorage...");
          if (window.localStorage['nikkiDB']) {
            return Entries.reload(callback);
          }
          else {
            return Entries.reset(callback);
          }
        }
        else {
          console.log("Checking for entries in data directory...");
          var dataDir = Entries.getDataDirectory();
          $cordovaFile.checkFile(dataDir, "entries.json")
          .then(
            function (success) {
              return Entries.reload(callback);
            },
            function (error) {
              console.log("Creating new entries file...")
              $cordovaFile.createFile(dataDir, "entries.json", false)
              .then(
                function (success) {
                  return Entries.reset(callback);
                },
                function (error) {
                  console.error("Failed creating entries.json");
                  return callback(error);
                }
              );
            }
          );
        }
      });
    },

    // Reloads all entries from storage.
    reload: function(callback) {
      if (!window.cordova) {
        console.log("Reloading entries from localStorage...");
        var json = window.localStorage['nikkiDB'];
        if (!json) {
          return callback(new Error("No database found in localStorage"));
        }
        else {
          return Entries.loadJSON(json, callback);
        }
      }
      else {
        console.log("Reloading entries from data directory...");
        $cordovaFile.readAsText(Entries.getDataDirectory(), "entries.json")
        .then(
          function (success) {
            var json = success;
            console.log("Current db: '" + JSON.stringify(db, null, 2) + "'");
            console.log("entries.json: '" + json + "'");
            return Entries.loadJSON(json, callback);
          },
          function (error) {
            console.error("Failed reading entries: ", error);
            return callback(error);
          }
        );
      }
    },

    // Loads entries database from given JSON string.
    loadJSON: function(json, callback) {
      console.log("Loading JSON entries: '" + json + "'");
      var result = angular.fromJson(json);

      // Deserialize dates
      var timestamp = Date.parse(result.lastWrittenAt);
      var isValid = !isNaN(timestamp);

      result.lastWrittenAt = isValid
        ? new Date(timestamp)
        : null;

      if (result.lastWrittenAt > db.lastWrittenAt || !db.lastWrittenAt) {
        db = result;
        console.log("Loaded entries database: ", JSON.stringify(db, null, 2));
        return callback(null);
      }
      else {
        console.error("Failed loading entries. File older than current data: ", result);
        return callback(new Error);
      }
    },

    // Commits all entries to storage.
    commit: function(callback) {
      console.log("Committing entries!");
      callback = callback || function () {};

      db.lastWrittenAt = new Date();
      var json = angular.toJson(db);

      if (!window.cordova) {
        console.log("Saving to localStorage...");
        window.localStorage['nikkiDB'] = json;
        return callback(null);
      }
      else {
        console.log("Saving to data directory...");
        var dataDir = Entries.getDataDirectory();
        $cordovaFile.writeFile(dataDir, "entries.json", json, true)
        .then(
          function (success) {
            console.log("Finished saving database!");
            console.log("json: ", json);
            return callback(null);
          },
          function (error) {
            console.error("Error saving database to data directory: " + JSON.stringify(error, null, 2));
            return callback(new Error("Error saving database: " + JSON.stringify(error)));
          }
        );
      }
    },

    // Gets all journal entries as an array.
    all: function() {
      return db.entries;
    },

    // Gets the most recently created journal entry.
    last: function() {
      return db.entries[db.entries.length - 1];
    },

    // Gets the next journal entry id.
    nextId: function() {
      return db.entries.length > 0
        ? Entries.last().id + 1
        : 0;
    },

    // Creates a new journal entry.
    create: function(options) {
      console.log("Creating entry!");
      options = arguments[0] || {};
      var entry = {
        id: options.id || Entries.nextId(),
        author: options.author || null,
        date: options.date || new Date(),
        text: options.text || "What's on my mind today?",
        title: options.title || "Title"
      };
      console.log("entry: ", entry);
      db.entries.push(entry);
      return entry;
    },

    // Removes a given entry object.
    remove: function(entry) {
      db.entries.splice(db.entries.indexOf(entry), 1);
    },

    // Gets a journal entry by id.
    get: function(entryId) {
      for (var i = 0; i < db.entries.length; i++) {
        if (db.entries[i].id === parseInt(entryId)) {
          return db.entries[i];
        }
      }
      return null;
    },

    // Gets statistics for series of entries.
    getStatsForSeries: function(series) {
      var stats = {
        bytes: 0,
        entries: 0,
        words: 0
      };
      for (var i = 0; i < series.length; i++) {
        var entry = series[i];
        var text = entry.text;
        var words = text.split(/ +/);
        stats.bytes += text.length;
        stats.entries += 1;
        stats.words += words.length;
      }
      return stats;
    },

    // Gets statistics for database entries.
    getStats: function() {
      var stats = {
        daily: {},
        weekly: {},
        monthly: {},
        yearly: {},
        allTime: {}
      };
      var groups = {
        daily: [],
        weekly: [],
        monthly: [],
        yearly: [],
        allTime: []
      };
      for (var i = 0; i < db.entries.length; i++) {
        var today = new Date();
        var entry = db.entries[i];
        var date = new Date(entry.date);
        var days = 24 * 3600 * 1000;

        // Naive rolling stats, for now...
        if (today - date < 1 * days) groups.daily.push(entry);
        if (today - date < 7 * days) groups.weekly.push(entry);
        if (today - date < 30 * days) groups.monthly.push(entry);
        if (today - date < 365 * days) groups.yearly.push(entry);
        groups.allTime.push(entry);
      }
      stats.daily   = Entries.getStatsForSeries(groups.daily);
      stats.weekly  = Entries.getStatsForSeries(groups.weekly);
      stats.monthly = Entries.getStatsForSeries(groups.monthly);
      stats.yearly  = Entries.getStatsForSeries(groups.yearly);
      stats.allTime = Entries.getStatsForSeries(groups.allTime);
      return stats;
    }
  };

  Uta.Entries = Entries;
  return Entries;
});
