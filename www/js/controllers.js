angular.module('diary.controllers', [])

.filter('renderMarkdown', function() {
  return function(text) {
    var converter = new showdown.Converter();
    var html = converter.makeHtml(text);
    return html;
  }
})

.controller('SplashCtrl', function($scope, $state, $timeout, Uta, Init) {
  Init.initSplashScreen().finally(function() {
    console.log("Leaving splash screen!");
    $state.go('start');
  });
})

.controller('IntroCtrl', function($scope, $state, $ionicSlideBoxDelegate, Uta) {
  $scope.startApp = function() {
    $state.go('tab.journal');
  };

  $scope.next = function() {
    $ionicSlideBoxDelegate.next();
  };

  $scope.previous = function() {
    $ionicSlideBoxDelegate.previous();
  };

  $scope.slideChanged = function(index) {
    $scope.slideIndex = index;
  };

  $scope.finishTutorial = function() {
    Uta.db.events.completeTutorial = new Date();
    Uta.db.settings.enableTutorial = false;
    Uta.commit(function(err) {
      $state.go('tab.journal');
    });
  };
})

.controller('StartCtrl', function($scope, $state, Uta, Init) {
})

.controller('PassphraseCtrl', function($http, $scope, $state, Uta, Crypto, KeyRing) {
  $scope.passphrase = '';
  $scope.confirmation = '';
  $scope.suggestion = '';
  $scope.formErrors = [];
  $scope.wordlist = [];
  $scope.tokens = [];
  $scope.requireCurrentPassphrase =
    Uta.db.settings.enableEncryption &&
    Uta.db.events.createPassphrase;

  $scope.init = function() {
    $scope.loadWordlist();
    $scope.validateStrength();
  };

  $scope.loadWordlist = function() {
    $http.get("templates/wordlist.txt").then(function(response) {
      $scope.wordlist = response.data.split(/\n/g);
      $scope.tokens = [].concat($scope.wordlist);
    });
  };

  $scope.validateStrength = function(entropy) {
    $scope.pbkdfRounds = 1e5;
    // Hashrate for Nvidia Titan X: ~2.4 GH/s (SHA-256)
    // https://gist.github.com/epixoip/63c2ad11baf7bbd57544
    $scope.gpuHashrate = 2.4e9;
    $scope.strength = zxcvbn($scope.passphrase, $scope.tokens);
    $scope.entropy = entropy
      ? entropy
      : Math.max(0, Math.log2(2 * ($scope.strength.guesses - 1)));
    $scope.guesses = entropy
      ? 1 + 0.5 * Math.pow(2, entropy)
      : $scope.strength.guesses;
    $scope.guessesPerSecond = $scope.gpuHashrate / $scope.pbkdfRounds;
    $scope.secondsToCrack = $scope.guesses / $scope.guessesPerSecond;
    $scope.yearsToCrack = $scope.secondsToCrack / (3600 * 24 * 365);
    $scope.yearsScientific = $scope.yearsToCrack.toPrecision(3)
      .replace(/e\+/, " ⨉ 10<sup>") + "</sup> years";
    $scope.timeToCrack = $scope.secondsToCrack <= 1
      ? "1 second or less"
      : $scope.yearsToCrack < 1e9
      ? moment.duration(1000 * $scope.secondsToCrack).humanize()
      : $scope.yearsScientific;
  };

  $scope.suggestPassphrase = function() {
    var totalWords = $scope.wordlist.length;
    var wordCount = 9;
    var words = [];
    var values = new Uint32Array(wordCount);
    window.crypto.getRandomValues(values);

    for (var i = 0; i < wordCount; i++) {
      var index = values[i] % totalWords;
      var word = $scope.wordlist[index];
      words.push(word);
    }
    $scope.suggestion = words.join(' ').replace(/(\w+ \w+ \w+)/g, '$1<br>');

    var entropy = wordCount * Math.log2(totalWords);
    $scope.validateStrength(entropy);
  };

  $scope.validate = function() {
    if ($scope.requireCurrentPassphrase &&
        $scope.currentPassphrase != Uta.keyRing.passphrase)
      return new Error("Current passphrase must match your existing passphrase");

    if ($scope.confirmation != $scope.passphrase)
      return new Error("Passphrase and confirmation must match!");
  };

  $scope.submit = function() {
    var error = $scope.validate();
    if (error)
      return $scope.fail("Failed validation", error);

    var salt = Crypto.generateSalt(16);
    KeyRing.create($scope.passphrase, salt)
    .then(
      function(keyRing) {
        console.log("Creating key ring...");
        Uta.keyRing = keyRing;
      }
    )
    .then(
      function() {
        console.log("Creating vault...");
        Uta.db.events.createPassphrase = new Date();
        Uta.db.settings.enableEncryption = true;
        Uta.commit(
          function(err) {
            if (err) {
              var error = new Error("Failed creating vault: " + err.message);
              return $scope.fail("Failed creating vault", error, err);
            }
            return $scope.success();
          }
        );
      }
    )
    .catch(
      function(err) {
        var error = new Error("Failed creating passphrase: " + err.message);
        return $scope.fail("Failed creating passphrase", error, err);
      }
    );
  };

  $scope.success = function() {
    document.getElementsByName('passphrase')[0].type = 'password';
    document.getElementsByName('confirmation')[0].type = 'password';
    $state.go('intro');
  };

  $scope.fail = function(status, error, details) {
    console.error(status, error, details);
    $scope.formErrors = [ error ];
  };

  $scope.init();
})

.controller('LoginCtrl', function($scope, $state, Uta, KeyRing) {
  $scope.passphrase = '';
  $scope.formErrors = [];

  $scope.validate = function() {
  };

  $scope.submit = function() {
    var error = $scope.validate();
    if (error)
      return $scope.fail("Failed validation", error);

    console.log("Opening vault...");
    Uta.vault.retrieve($scope.passphrase)
    .then(
      function(data) {
        console.log("Updating key ring...");
        return KeyRing.create($scope.passphrase, Uta.vault.storage.salt)
        .then(
          function(keyRing) {
            Uta.keyRing = keyRing;
          }
        );
      }
    )
    .then(
      function() {
        console.log("Reloading database...");
        Uta.reload(function() {
          return $scope.success();
        });
      }
    )
    .catch(
      function(details) {
        var status = "Failed decryption";
        var error = new Error("Vault decryption failed. Please check your passphrase!");
        return $scope.fail(status, error, details);
      }
    );
  };

  $scope.success = function() {
    var input = document.getElementsByName('passphrase')[0].type = 'password';
    $state.go('intro');
  };

  $scope.fail = function(status, error, details) {
    console.error(status, error, details);
    $scope.formErrors = [ error ];
  };
})

.controller('JournalCtrl', function($scope, Uta, Entries) {
  $scope.Entries = Entries;
  $scope.entries = Entries.all();
  $scope.create = function() {
    var options = {
      date: new Date(),
      title: "Title"
    };
    var entry = Entries.create(options);
    Uta.commit();
  };
  $scope.remove = function(chat) {
    Entries.remove(chat);
    Uta.commit();
  };
  $scope.$watch('Entries.all()', function() {
      $scope.entries = Entries.all();
    }
  );
})

.controller('JournalDetailCtrl', function($scope, $stateParams, Uta, Entries) {
  $scope.Entries = Entries;
  $scope.entry = Entries.get($stateParams.entryId);
})

.controller('KitsuneCtrl', function($scope, Kitsune) {
  $scope.entries = Kitsune.all();
  $scope.avatarURL = "https://pbs.twimg.com/media/CKBfWLqUkAAaD6V.png:large";
})

.controller('KitsuneDetailCtrl', function($scope, $stateParams, Kitsune) {
  $scope.entry = Kitsune.get($stateParams.kitsuneId);
  $scope.avatarURL = "https://pbs.twimg.com/media/CKBfWLqUkAAaD6V.png:large";
})

.controller('StatsCtrl', function($scope, Uta, Entries) {
  $scope.stats = Entries.getStats();
})

.controller('SettingsCtrl', function($scope, $state, Uta, Entries) {
  $scope.Uta = Uta;
  $scope.save = function() {
    Uta.commit();
  };
  $scope.changePassphrase = function() {
    if (Uta.db.settings.enableEncryption) {
      console.log("Navigating to passphrase screen...")
      $state.go('passphrase');
    }
  };
  $scope.enableEncryption = function() {
    var activated = Uta.db.settings.enableEncryption;
    if (activated) {
      console.log("Will enable encryption when passphrase created...");
      Uta.db.events.createPassphrase = null;
      Uta.db.settings.enableEncryption = false;
      Uta.commit(function() {
        console.log("Navigating to passphrase screen...");
        $state.go('passphrase');
      });
    }
    else {
      $scope.save();
    }
  };
})

.controller('ProfileCtrl', function($scope, Uta) {
  $scope.Uta = Uta;
})

.controller('BackupsCtrl', function($scope, $ionicActionSheet, $ionicPopup, Uta, Backups) {
  $scope.Uta = Uta;
  $scope.backups = [];

  $scope.refresh = function() {
    Uta.listBackupFiles(function(files) {
      console.log('Backup files: ' + JSON.stringify(files, null, 2));
      $scope.backups = files;
    });
  };

  $scope.refresh();

  $scope.notify = function(options) {
    $scope.alert(options);
    $scope.refresh();
  };

  $scope.alert = function(options) {
    var alertPopup = $ionicPopup.alert(options);
    alertPopup.then(function(res) {
      console.log(options.template);
    });
  };

  $scope.confirmImport = function(callback) {
    $scope.importOptions = {};
    var popup = $ionicPopup.show({
      template: '',
      title: "Import Backup",
      subTitle: "This replaces your current journals and settings. Continue?",
      scope: $scope,
      buttons: [
        {
          text: 'Cancel',
          onTap: function(e) {
            console.log("Cancelled import");
          }
        },
        {
          text: '<b>Import</b>',
          type: 'button-positive',
          onTap: function(event) {
            var options = $scope.importOptions;
            if (options) {
              console.log("Selected import options: " + JSON.stringify(options));
              return callback(options);
            }
          }
        }
      ]
    });
  };

  $scope.confirmDelete = function(callback) {
    $scope.deleteOptions = {};
    var popup = $ionicPopup.show({
      template: '',
      title: "Delete Backup",
      subTitle: "This deletes the selected backup file. Continue?",
      scope: $scope,
      buttons: [
        {
          text: 'Cancel',
          onTap: function(e) {
            console.log("Cancelled deletion");
          }
        },
        {
          text: '<b>Delete</b>',
          type: 'button-assertive',
          onTap: function(event) {
            var options = $scope.deleteOptions;
            if (options) {
              console.log("Selected delete options: " + JSON.stringify(options));
              return callback(options);
            }
          }
        }
      ]
    });
  };

  $scope.selectExportOptions = function(callback) {
    var date = new Date();
    var timestamp = date.toISOString().slice(0, 10);
    $scope.exportOptions = {
      filename: 'journal-' + timestamp + '.json'
    };
    var popup = $ionicPopup.show({
      template: '<input type="text" ng-model="exportOptions.filename">',
      title: 'Backup File',
      subTitle: 'Choose a name for your backup',
      scope: $scope,
      buttons: [
        {
          text: 'Cancel',
          onTap: function(e) {
            console.log("Cancelled export");
          }
        },
        {
          text: '<b>Save</b>',
          type: 'button-positive',
          onTap: function(event) {
            var options = $scope.exportOptions;
            if (!options.filename) {
              event.preventDefault();
            } else {
              console.log("Selected export options: " + JSON.stringify(options));
              return callback(options);
            }
          }
        }
      ]
    });
  };

  $scope.export = function() {
    var root = Uta.getBackupRoot();
    var path = 'UtaDiary/backups/';
    $scope.selectExportOptions(function(options) {
      if (options.filename) {
        var file = options.filename;
        $scope.exportBackup(file);
      }
      else {
        $scope.notify({ title: "Error", template: "Invalid name for backup file" });
      }
    });
  };

  $scope.importBackup = function(backup) {
    console.log("Importing backup: " + backup);
    $scope.confirmImport(function(options) {
      Uta.Backups.import(backup, function(err) {
        if (err)
          $scope.notify({ title: "Error", template: "Error importing from " + backup + "<br>\n" + err.message });
        else
          $scope.notify({ title: "Success!", template: "Imported database from " + backup });
      });
    });
  };

  $scope.exportBackup = function(backup) {
    console.log("Exporting backup: " + backup);
    Uta.Backups.export(backup, function(err) {
      if (err)
        $scope.notify({ title: "Error", template: "Error exporting to " + backup + "<br>\n" + err.message });
      else
        $scope.notify({ title: "Success!", template: "Exported database to " + backup });
    });
  };

  $scope.deleteBackup = function(backup) {
    console.log("Deleting backup: " + backup);
    $scope.confirmDelete(function(options) {
      Uta.Backups.delete(backup, function(err) {
        if (err)
          $scope.notify({ title: "Error", template: "Error deleting " + backup + "<br>\n" + err.message });
        else
          $scope.notify({ title: "Success!", template: "Deleted backup " + backup });
      });
    });
  };
});
