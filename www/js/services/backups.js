
angular.module('diary.services')

.factory('Backups', function(FileUtils) {

  var Uta = null;
  var Backups = {

    // Initialises the module.
    init: function(uta) {
      Uta = uta;
      return this;
    },

    // Lists available backups by name.
    list: function(callback) {
      if (window.require) {
        var json = window.localStorage.backups || '{}';
        var backups = JSON.parse(json);
        var names = _.keys(backups);
        return callback(names);
      }
      else {
        return Backups.listBackupFiles(callback)
      }
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

    // Creates backup by name.
    create: function(backup, options, callback) {
      if (window.require) {
        var json = window.localStorage.backups || '{}';
        var backups = JSON.parse(json);
        Uta.serialize(options)
        .then(
          function(data) {
            console.log("Created backup data: ", data);
            backups[backup] = data;
            window.localStorage.backups = JSON.stringify(backups, null, '  ');
            return callback(null);
          }
        )
        .catch(
          function(error) {
            return callback("Error serializing backup: " + error.message);
          }
        );
      }
      else {
        return Uta.exportFile(Uta.getBackupDirectory(), backup, options, callback);
      }
    },

    // Restores backup by name.
    restore: function(name, options, callback) {
      if (window.require) {
        var json = window.localStorage.backups || '{}';
        var backups = JSON.parse(json);
        var data = backups[name];
        return Uta.loadJSON(data, options, callback);
      }
      else {
        return Uta.importFile(Uta.getBackupDirectory(), backup, options, callback);
      }
    },

    // Deletes backup by name.
    'delete': function(name, callback) {
      if (window.require) {
        var json = window.localStorage.backups || '{}';
        var backups = JSON.parse(json);

        delete backups[name];
        window.localStorage.backups = JSON.stringify(backups, null, '  ');

        return callback(null);
      }
      else {
        return Uta.deleteFile(Uta.getBackupDirectory(), backup, callback);
      }
    }
  };

  return Backups;
});
