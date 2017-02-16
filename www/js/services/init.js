
angular.module('diary.services')

.factory('welcomeText', function($http) {
    console.log("Loading welcome text...");
    return $http.get('./templates/welcome.md').then(function(response) {
      return response.data;
    });
  }
)

.factory('Init', function($q, Uta, welcomeText, Crypto, KeyRing, Vault) {

  var Init = {};

  Init.initSplashScreen = function() {
    console.log("Waiting for database...");

    var deferred = $q.defer();

    var main = function() {

      waitForFS(function() {

        startDB(function(err, db) {
          if (err) return fail("Failed starting database: ", err);

          runTests(function(err) {
            if (err) console.error("Failed Uta tests: " + err.message);

            runMigrations(function() {
              resolveDB();
            });
          });
        });
      });
    };

    var waited = 0;
    var waitForFS = function(callback) {
      setTimeout(function() {
        console.log("Waiting for filesystem...")
        var isMobile = ionic.Platform.isWebView();

        if (isMobile && !window.requestFileSystem && waited < 9000) {
          waited += 500;
          waitForFS();
        }
        else {
          return callback();
        }
      }, 500);
    };

    var startDB = function(callback) {
      console.log("Starting database...");
      loadKeyRing(function(err) {
        loadWelcomeText(function() {
          Uta.Entries.start(function(err) {
            if (err) return callback(err);

            // Check for existing entries
            if (Uta.Entries.all().length == 0) {
              // Add a welcome entry
              var welcome = _.clone( Uta.Entries.examples.welcome );
              Uta.Entries.create(welcome);
              Uta.commit();
            }
            console.log("Initial entries: ", Uta.Entries.all());

            return callback(null, Uta.Entries.db());
          });
        });
      });
    };

    var loadKeyRing = function(callback) {
      console.log("Loading key ring...");

      loadVaultMetadata(function(err, vault) {
        if (err) return callback(err);

        if (vault) {
          console.log("Loaded vault: ", vault);
        }
        else {
          vault = new Vault();
          console.log("Created new vault: ", vault);
        }

        vault = vault || new Vault();

        loadPassphrase(function(err, passphrase) {
          if (err) return callback(err);

          var pass = passphrase;
          var salt = vault.storage.salt || Crypto.generateSalt(16);

          KeyRing.create(pass, salt)
          .then(
            function(keyRing) {
              console.log("Created key ring");
              Uta.vault = vault;
              Uta.keyRing = keyRing;
              return callback(null);
            }
          )
          .catch(
            function(error) {
              console.log("Failed creating key ring: " + error.message);
            }
          );
        });
      });
    };

    var loadWelcomeText = function(callback) {
      welcomeText
      .then(
        function(text) {
          Uta.Entries.examples.welcome.text = text;
          return callback();
        }
      )
    };

    var loadVaultMetadata = function(callback) {
      console.log("Loading vault metadata...");

      var handleJSON = function(json) {
        var data = angular.fromJson(json);
        if (!data || !data.vault)
          return callback(null);

        var vault = new Vault();
        vault.deserialize(json);
        return callback(null, vault);
      };

      var handleError = function(err) {
        console.error("Failed loading vault metadata: " + err.message);
      };

      if (window.cordova) {
        Uta.readFile(Uta.getDataDirectory(), "entries.json")
          .then(handleJSON, handleError);
      }
      else {
        Uta.readLocalStorage('diaryDB')
          .then(handleJSON, handleError);
      }
    };

    var loadPassphrase = function(callback) {
      console.log("Loading empty passphrase...");
      // TODO: Prompt for passphrase
      var passphrase = '';
      return callback(null, passphrase);
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

    var fail = function(message, error, details) {
      console.error(message, error, details);
      return deferred.reject(error);
    };

    main();
    return deferred.promise;
  };

  Init.initStartScreen = function() {
    var q = $q.defer();
    q.resolve();
    return q.promise;
  };

  Init.initLoginScreen = function() {
    var q = $q.defer();
    q.resolve();
    return q.promise;
  };

  Init.initIntroScreen = function() {
    var q = $q.defer();
    q.resolve();
    return q.promise;
  };

  Init.initJournalScreen = function() {
    var q = $q.defer();
    q.resolve();
    return q.promise;
  };

  return Init;
});
