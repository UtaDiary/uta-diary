
angular.module('nikki.services')

.factory('Database', function() {

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
        entries: [ Uta.Entries.examples.welcome ],
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

    // Validates a database object.
    validateDB: function(database) {
      var isObject = _.isObject(database);
      var hasEntries = _.isArray(database.entries);
      var isValid = isObject && hasEntries;
      return isValid;
    }
  };

  return Database;
});
