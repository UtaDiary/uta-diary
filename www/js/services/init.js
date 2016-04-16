
angular.module('nikki.services')

.factory('welcomeText', function($http) {
    console.log("Loading welcome text...");
    return $http.get('./templates/welcome.md').then(function(response) {
      return response.data;
    });
  }
)

.factory('Init', function($q, Uta, welcomeText) {
  console.log("Waiting for database...");

  var deferred = $q.defer();
  var waited = 0;
  var waitForFS = function() {
    setTimeout(function() {
      console.log("Waiting for filesystem...")
      var isMobile = ionic.Platform.isWebView();

      if (isMobile && !window.requestFileSystem && waited < 9000) {
        waited += 500;
        waitForFS();
      }
      else {
        startDB(function(err, db) {
          if (err) return console.error(err.message);

          runTests(function(err) {
            if (err) console.error("Failed Uta tests: " + err.message);

            runMigrations(function() {
              resolveDB();
            });
          });
        });
      }
    }, 500);
  };

  var startDB = function(callback) {
    Uta.Entries.examples.welcome.text = welcomeText;
    Uta.Entries.start(function(err) {
      if (err) return callback(err);

      // Check for existing entries
      if (Uta.Entries.all().length == 0) {
        // Add a welcome entry
        Uta.Entries.create(Uta.Entries.examples.welcome);
        Uta.Entries.commit();
      }
      console.log("Initial entries: ", Uta.Entries.all());

      return callback(null, Uta.Entries.db());
    });
  };

  var runTests = function(callback) {
    if (Uta.db.settings.enableDebug == true) {
      return Uta.Test.runAll(callback);
    }
    else {
      return callback(null)
    }
  };

  var runMigrations = function(callback) {
    Uta.migrateUp(callback);
  };

  var resolveDB = function() {
    deferred.resolve(Uta.db);
  };

  waitForFS();
  return deferred.promise;
});
