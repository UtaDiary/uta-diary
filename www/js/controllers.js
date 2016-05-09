angular.module('diary.controllers', [])

.filter('renderMarkdown', function() {
  return function(text) {
    var converter = new showdown.Converter();
    var html = converter.makeHtml(text);
    return html;
  }
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
    Uta.db.settings.enableTutorial = false;
    Uta.commit(function(err) {
      $state.go('tab.journal');
    });
  };
})

.controller('LoginCtrl', function($scope, $state, Uta, KeyRing) {
  $scope.passphrase = '';
  $scope.confirmation = '';

  $scope.submit = function() {
    // Try passphrase
    Uta.vault.retrieve($scope.passphrase)
    .then(
      function(data) {
        // Update keys
        return KeyRing.create($scope.passphrase, $scope.salt)
        .then(
          function(keyRing) {
            Uta.keyRing = keyRing;
          }
        );
      }
    )
    .then(
      function() {
        // Reload database
        Uta.reload(function() {
          return $scope.success();
        });
      }
    )
    .catch(
      function(error) {
        return $scope.error(error);
      }
    );
  };

  $scope.success = function() {
    // Continue
    $state.go('tab.journal');
  };

  $scope.error = function(error) {
    // Retry
    console.error("Failed login: " + error.message);
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

.controller('SettingsCtrl', function($scope, Uta, Entries) {
  $scope.Uta = Uta;
  $scope.save = function() {
    Uta.commit();
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
