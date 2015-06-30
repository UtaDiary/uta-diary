angular.module('nikki.services', [])

.factory('Entries', function() {

  var db = {};

  // Example entries
  var examples = {
    welcome: {
      date: new Date(2015, 06, 17),
      title: 'Welcome!',
      text: "Thanks for using Uta Nikki!\n\nHopefully, these notes will help you get started."
    },
    first: {
      date: new Date(2015, 06, 02),
      title: 'Looking Forward',
      text: "A few notes to myself on where I'd like to go."
    },
    second: {
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

    // Gets database default values.
    dbDefaults: function() {
      var defaults = {
        lastWrittenAt: null,
        entries: []
      };
      return defaults;
    },

    // Resets entries database.
    reset: function(callback) {
      console.log("Initialising database...");
      db = Entries.dbDefaults();
      return callback(null);
    },

    // Starts entries database.
    start: function(callback) {
      console.log("Starting database");
      Entries.reload(callback);
    },

    // Reloads all entries from storage.
    reload: function(callback) {
      console.log("Reloading entries!");
      var sdPath = "/Android/data/com.ionicframework.utanikki207884/files/";
      var name = "entries.json";
      var fullname = sdPath + name;
      var isMobile = window.requestFileSystem;

      var fsSuccess = function(fs) {
        console.log("Got file system: ", fs);
        console.log("Creating entries file...");
        var options = {
          create: true,
          exclusive: false
        };
        fs.root.getFile(fullname, options, fileEntrySuccess, fileEntryFail);
      };
      var fileEntrySuccess = function(fileEntry) {
        console.log("Got file entry: ", fileEntry);
        fileEntry.file(fileSuccess, fileFail);
      };
      var fileSuccess = function(file) {
        console.log("Got file: ", file);

        // Read file
        var reader = new FileReader();

        reader.onloadend = function(event) {
          var result = event.target.result;
          console.log("Finished loading file!");
          console.log(result);

          if (result == "" && db.lastWrittenAt == null) {
            console.warn("Found empty entries file");
            return Entries.reset(callback);
          }
          else {
            try {
              var data = JSON.parse(result);
              if (data.entries) {
                console.log("Updating entries from file");
                db.entries = data.entries;
                return callback(null);
              }
            }
            catch (error) {
              console.error("Failed parsing entries.json, file may be corrupt");
              return callback(new Error());
            }
          }
        };
        reader.readAsText(file);
      };
      var fsFail = function() {
        console.log("Failed reading filesystem.");
        fail();
      };
      var fileEntryFail = function(error) {
        console.log("Failed getting file entry: ", error);
        fail();
      };
      var fileFail = function(error) {
        console.log("Failed reading file: ", error);
        fail();
      };
      var fail = function(error) {
        console.log("Failed with error: ", error);
        return callback(new Error());
      };

      if (isMobile) {
        console.log("Loading mobile filesystem...");
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, fsSuccess, fsFail);
      }
      else {
        console.log("Skipping persistence in the browser for now...");
      }
    },

    // Commits all entries to storage.
    commit: function() {
      console.log("Committing entries!");
      // Write file
      // var fileWriter = fileEntry.createWriter();
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
      options = arguments[0] || {};
      var entry = {
        id: options.id || Entries.nextId(),
        date: options.date || new Date(),
        text: options.text || "What's on my mind today?",
        title: options.title || "Title"
      };
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
