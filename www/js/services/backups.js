
angular.module('diary.services')

.factory('Backups', function() {

  var Uta = null;
  var Backups = {

    // Initialises the module.
    init: function(uta) {
      Uta = uta;
      return this;
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
