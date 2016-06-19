
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

    // Imports backup by name.
    import: function(backup, options, callback) {
      Uta.importFile(Uta.getBackupDirectory(), backup, options, callback);
    },

    // Exports backup by name.
    export: function(backup, options, callback) {
      Uta.exportFile(Uta.getBackupDirectory(), backup, options, callback);
    },

    // Deletes backup by name.
    'delete': function(backup, callback) {
      Uta.deleteFile(Uta.getBackupDirectory(), backup, callback);
    }
  };

  return Backups;
});
