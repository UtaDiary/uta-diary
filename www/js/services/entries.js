
angular.module('diary.services')

.factory('Entries', function($cordovaFile, FileUtils, Database) {

  var Uta = null;

  // Example entries
  var examples = {
    welcome: {
      id: 0,
      author: 'Kitsune',
      date: new Date(2015, 06, 17),
      title: 'Welcome!',
      text: "Thanks for using Uta Diary!\n\nHopefully, these notes will help you get started."
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
      return Uta.db;
    },

    // Initialises the module.
    init: function(uta) {
      Uta = uta;
      return this;
    },

    // Resets entries database.
    reset: function(callback) {
      console.log("Resetting database...");
      Uta.db = Database.defaults();
      Entries.commit(callback);
    },

    // Starts entries database.
    start: function(callback) {
      console.log("Starting database");

      ionic.Platform.ready(function() {
        if (!window.cordova) {
          console.log("Checking for entries in localStorage...");
          if (window.localStorage['diaryDB']) {
            return Entries.reload(callback);
          }
          else {
            return Entries.reset(callback);
          }
        }
        else {
          console.log("Checking for entries in data directory...");
          var dataDir = Uta.getDataDirectory();

          FileUtils.listDir(dataDir, function () {});

          $cordovaFile.checkFile(dataDir, "entries.json")
          .then(
            function(success) {
              return Entries.reload(callback);
            },
            function(error) {
              console.warn("Error checking entries file: " + JSON.stringify(error));
              $cordovaFile.checkFile(Uta.getBackupParent(), 'defaults.json')
              .then(
                function(success) {
                  console.log("Copying default entries file...")
                  return $cordovaFile.copyFile(
                    Uta.getBackupParent(), 'defaults.json',
                    Uta.getDataDirectory(), 'entries.json'
                  );
                }
              )
              .then(
                function(success) {
                  console.log("Finished copying default entries");
                  return Entries.reload(callback);
                }
              )
              .catch(
                function(error) {
                  console.log("Error checking defaults file: " + JSON.stringify(error));
                  console.log("Creating new entries file...")
                  $cordovaFile.createFile(dataDir, "entries.json", false)
                  .then(
                    function(success) {
                      return Entries.reset(callback);
                    },
                    function(error) {
                      console.error("Failed creating entries.json");
                      return callback(error);
                    }
                  );
                }
              )
            }
          );
        }
      });
    },

    // Reloads all entries from storage.
    reload: function(callback) {
      if (!window.cordova) {
        console.log("Reloading entries from localStorage...");
        var json = window.localStorage['diaryDB'];
        if (!json) {
          return callback(new Error("No database found in localStorage"));
        }
        else {
          return Entries.loadJSON(json, callback);
        }
      }
      else {
        console.log("Reloading entries from data directory...");
        $cordovaFile.readAsText(Uta.getDataDirectory(), "entries.json")
        .then(
          function (success) {
            var json = success;
            console.log("Current db: '" + JSON.stringify(Uta.db, null, 2) + "'");
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
      console.log("Loading JSON: '" + json + "'");
      var result = angular.fromJson(json);

      // Deserialize dates
      var timestamp = Date.parse(result.lastWrittenAt);
      var isValid = !isNaN(timestamp);

      result.lastWrittenAt = isValid
        ? new Date(timestamp)
        : null;

      console.log("Current timestamp: " + Uta.db.lastWrittenAt);
      console.log("JSON timestamp: " + result.lastWrittenAt);

      if (result.lastWrittenAt >= Uta.db.lastWrittenAt || !Uta.db.lastWrittenAt) {
        Uta.db = result;
        console.log("Loaded entries database: ", JSON.stringify(Uta.db, null, 2));
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

      Uta.db.lastWrittenAt = new Date();
      var json = angular.toJson(Uta.db);

      if (!window.cordova) {
        console.log("Saving to localStorage...");
        window.localStorage['diaryDB'] = json;
        return callback(null);
      }
      else {
        console.log("Saving to data directory...");
        var dataDir = Uta.getDataDirectory();
        FileUtils.writeFile(dataDir, "entries.json", json, true, function(err) {
          if (err) {
            var message = "Error saving database: " + JSON.stringify(err);
            console.error(message);
            return callback(new Error(message));
          }
          else {
            console.log("Finished saving database!");
            console.log("json: ", json);
            return callback(null);
          }
        });
      }
    },

    // Gets all journal entries as an array.
    all: function() {
      return Uta.db.entries;
    },

    // Gets the most recently created journal entry.
    last: function() {
      return Uta.db.entries[Uta.db.entries.length - 1];
    },

    // Gets the next journal entry id.
    nextId: function() {
      return Uta.db.entries.length > 0
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
      Uta.db.entries.push(entry);
      return entry;
    },

    // Removes a given entry object.
    remove: function(entry) {
      Uta.db.entries.splice(Uta.db.entries.indexOf(entry), 1);
    },

    // Gets a journal entry by id.
    get: function(entryId) {
      for (var i = 0; i < Uta.db.entries.length; i++) {
        if (Uta.db.entries[i].id === parseInt(entryId)) {
          return Uta.db.entries[i];
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
      for (var i = 0; i < Uta.db.entries.length; i++) {
        var today = new Date();
        var entry = Uta.db.entries[i];
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

  return Entries;
});
