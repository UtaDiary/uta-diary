
angular.module('diary.services')

.factory('welcomeText', function($http) {
    console.log("Loading welcome text...");
    return $http.get('./templates/welcome.md').then(function(response) {
      return response.data;
    });
  }
)

.factory('Init', function($q, Uta, welcomeText, Crypto, KeyRing, Vault) {
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
    console.log("Loading vault metadata...")

    var handleJSON = function(json) {
      var data = angular.fromJson(json);
      if (!data.vault)
        return callback(null);

      var vault = new Vault();
      vault.deserialize(json);
      return callback(null, vault);
    };

    if (window.cordova) {
      Uta.readFile(Uta.getDataDirectory(), "entries.json")
        .then(handleJSON);
    }
    else {
      Uta.readLocalStorage('diaryDB')
        .then(handleJSON);
    }
  };

  var loadPassphrase = function(callback) {
    // TODO: Prompt for passphrase
    var passphrase = '';
    return callback(null, passphrase);
  };

  var loadKeyRing = function(callback) {

    loadVaultMetadata(function(err, vault) {
      if (err) return callback(err);

      vault = vault || new Vault();

      loadPassphrase(function(err, passphrase) {
        if (err) return callback(err);

        var pass = passphrase;
        var salt = vault.storage.salt || Crypto.generateSalt(16);

        KeyRing.create(pass, salt)
        .then(
          function(keyRing) {
            Uta.keyRing = keyRing;
            return callback(null);
          }
        );
      });
    });
  };

  var startDB = function(callback) {
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
