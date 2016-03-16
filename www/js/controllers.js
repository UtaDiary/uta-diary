angular.module('nikki.controllers', [])

.filter('renderMarkdown', function() {
  return function(text) {
    var converter = new showdown.Converter();
    var html = converter.makeHtml(text);
    return html;
  }
})

.controller('JournalCtrl', function($scope, Entries, db) {
  $scope.Entries = Entries;
  $scope.entries = Entries.all();
  $scope.create = function() {
    var options = {
      date: new Date(),
      title: "Title"
    };
    var entry = Entries.create(options);
    Entries.commit();
  };
  $scope.remove = function(chat) {
    Entries.remove(chat);
    Entries.commit();
  };
  $scope.$watch('Entries.all()', function() {
      $scope.entries = Entries.all();
    }
  );
})

.controller('JournalDetailCtrl', function($scope, $stateParams, Entries) {
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

.controller('StatsCtrl', function($scope, Entries, db) {
  $scope.stats = Entries.getStats();
})

.controller('SettingsCtrl', function($scope, $ionicActionSheet, $ionicPopup, Uta, FileBrowser, Entries, db) {
  $scope.Uta = Uta;

  $scope.alert = function(options) {
    var alertPopup = $ionicPopup.alert(options);
    alertPopup.then(function(res) {
      console.log(options.template);
    });
  };

  $scope.selectBackup = function(callback) {
    Uta.listBackupFiles(function(files) {
      var fileIcon = '<i class="icon ion-document-text calm"></i>';
      var closeIcon = '<i class="icon ion-close-round assertive"></i>';
      var actionSheet = $ionicActionSheet.show({
        titleText: 'Select backup file',
        buttons: files.map(function(file) {return { text: fileIcon + file }}),
        destructiveText: closeIcon + 'Cancel',
        destructiveButtonClicked: function() {
          console.log("Cancelled import");
          return true;
        },
        buttonClicked: function(index) {
          var file = files[index];
          console.log("Selected backup file: " + file);
          callback(file);
          return true;
        }
      });
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

  $scope.import = function() {
    var root = Uta.getBackupDirectory();
    var path = '';
    $scope.selectBackup(function(file) {
      $scope.importFile(root, path + file);
    });
  };

  $scope.export = function() {
    var root = Uta.getBackupRoot();
    var path = 'UtaDiary/backups/';
    $scope.selectExportOptions(function(options) {
      if (options.filename) {
        var file = options.filename;
        $scope.exportFile(root, path + file);
      }
      else {
        $scope.alert({ title: "Error", template: "Invalid name for backup file" });
      }
    });
  };

  $scope.importFile = function(path, file) {
    console.log("Importing file from: " + file);
    Uta.importFile(path, file, function(err) {
      if (err)
        $scope.alert({ title: "Error", template: "Error importing from " + file + "<br>\n" + err.message });
      else
        $scope.alert({ title: "Success!", template: "Imported database from " + file });
    });
  };

  $scope.exportFile = function(path, file) {
    console.log("Exporting file to: " + file);
    Uta.exportFile(path, file, function(err) {
      if (err)
        $scope.alert({ title: "Error", template: "Error exporting to " + file + "<br>\n" + err.message });
      else
        $scope.alert({ title: "Success!", template: "Exported database to " + file });
    });
  };

  $scope.selectFile = function(callback) {
    var extension = '';
    FileBrowser.chooseFile(extension).then(
      function(uri) {
        var file = uri;
        console.log("Selected file: " + file);
        return callback(null, file);
      },
      function(error) {
        console.error("Error selecting file: " + error);
        return callback(new Error("Error selecting file: " + error));
      }
    );
  };
})

.controller('BackupsCtrl', function($scope, $ionicActionSheet, $ionicPopup, Uta, Backups, db) {
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
    Uta.Backups.import(backup, function(err) {
      if (err)
        $scope.notify({ title: "Error", template: "Error importing from " + backup + "<br>\n" + err.message });
      else
        $scope.notify({ title: "Success!", template: "Imported database from " + backup });
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
    Uta.Backups.delete(backup, function(err) {
      if (err)
        $scope.notify({ title: "Error", template: "Error deleting " + backup + "<br>\n" + err.message });
      else
        $scope.notify({ title: "Success!", template: "Deleted backup " + backup });
    });
  };
});
