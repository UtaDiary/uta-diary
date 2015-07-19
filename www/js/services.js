angular.module('nikki.services', [])

.factory('Entries', function($cordovaFile) {

  var db = {};

  // Example entries
  var examples = {
    welcome: {
      id: 0,
      date: new Date(2015, 06, 17),
      title: 'Welcome!',
      text: "Thanks for using Uta Nikki!\n\nHopefully, these notes will help you get started."
    },
    first: {
      id: 1,
      date: new Date(2015, 06, 02),
      title: 'Looking Forward',
      text: "A few notes to myself on where I'd like to go."
    },
    second: {
      id: 2,
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

    // Gets default database values.
    defaults: function() {
      var defaults = {
        lastWrittenAt: null,
        entries: [ examples.welcome ]
      };
      return defaults;
    },

    // Resets entries database.
    reset: function(callback) {
      console.log("Resetting database...");
      db = Entries.defaults();
      return callback(null);
    },

    // Starts entries database.
    start: function(callback) {
      console.log("Starting database");

      ionic.Platform.ready(function() {

        if (!window.cordova) {
          console.log("Skipping entries file detection in browser");
          return Entries.reset(callback);
        }

        console.log("Checking for entries file");
        $cordovaFile.checkFile(cordova.file.externalDataDirectory, "entries.json")
        .then(
          function (success) {
            Entries.reload(callback);
          },
          function (error) {
            console.log("Creating new entries file...")
            $cordovaFile.createFile(cordova.file.externalDataDirectory, "entries.json", false)
            .then(
              function (success) {
                Entries.reload(callback);
              },
              function (error) {
                console.error("Failed creating entries.json");
                return callback(error);
              }
            );
          }
        );
      });
    },

    // Reloads all entries from storage.
    reload: function(callback) {
      console.log("Reloading entries!");

      if (!window.cordova) {
        console.log("Skipping database reload in browser");
        return callback(null);
      }

      $cordovaFile.readAsText(cordova.file.externalDataDirectory, "entries.json")
      .then(
        function (success) {
          console.log("Read entries file: ", success);
          var json = success;
          var result = angular.fromJson(success);

          // Deserialize dates
          var timestamp = Date.parse(result.lastWrittenAt);
          var isValid = !isNaN(timestamp);

          result.lastWrittenAt = isValid
            ? new Date(timestamp)
            : null;

          if (result.lastWrittenAt > db.lastWrittenAt || !db.lastWrittenAt) {
            db = result;
            console.log("Loaded entries database: ", db);
            return callback(null);
          }
          else {
            console.error("Failed loading entries. File older than current data: ", result);
            return callback(new Error);
          }
        },
        function (error) {
          console.error("Failed reading entries: ", error);
          return callback(error);
        }
      );
    },

    // Commits all entries to storage.
    commit: function() {
      console.log("Committing entries!");

      if (!window.cordova) {
        console.log("Skipping database commit in browser");
        return;
      }

      db.lastWrittenAt = new Date();
      var json = angular.toJson(db);

      $cordovaFile.writeFile(cordova.file.externalDataDirectory, "entries.json", json, true)
      .then(
        function (success) {
          console.log("Finished saving database!");
          console.log("json: ", json);
        },
        function (error) {
          console.error("Error saving database: ", error);
        }
      );
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
        var date = entry.date;
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
})

.factory('Chats', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var chats = [{
    id: 0,
    name: 'Ben Sparrow',
    lastText: 'You on your way?',
    face: 'https://pbs.twimg.com/profile_images/514549811765211136/9SgAuHeY.png'
  }, {
    id: 1,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me',
    face: 'https://avatars3.githubusercontent.com/u/11214?v=3&s=460'
  },{
    id: 2,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat',
    face: 'https://pbs.twimg.com/profile_images/479090794058379264/84TKj_qa.jpeg'
  }, {
    id: 3,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks!',
    face: 'https://pbs.twimg.com/profile_images/598205061232103424/3j5HUXMY.png'
  }, {
    id: 4,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream.',
    face: 'https://pbs.twimg.com/profile_images/578237281384841216/R3ae1n61.png'
  }];

  return {
    all: function() {
      return chats;
    },
    remove: function(chat) {
      chats.splice(chats.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < chats.length; i++) {
        if (chats[i].id === parseInt(chatId)) {
          return chats[i];
        }
      }
      return null;
    }
  };
});
