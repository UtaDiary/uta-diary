angular.module('nikki.controllers', [])

.filter('renderMarkdown', function() {
  return function(text) {
    var converter = new showdown.Converter();
    var html = converter.makeHtml(text);
    return html;
  }
})

.controller('JournalCtrl', function($scope, Entries, db) {
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

.controller('SettingsCtrl', function($scope, $ionicPopup, db, FileBrowser, Entries) {
  $scope.settings = db.settings;

  $scope.alert = function(options) {
    var alertPopup = $ionicPopup.alert(options);
    alertPopup.then(function(res) {
      console.log(options.template);
    });
  };

  $scope.import = function() {
    var path = cordova.file.externalRootDirectory;
    var file = 'UtaDiary/journal.json';
    $scope.importFile(path, file);
  };

  $scope.export = function() {
    var path = cordova.file.externalRootDirectory;
    var file = 'UtaDiary/journal.json';
    $scope.exportFile(path, file);
  };

  $scope.importFile = function(path, file) {
    console.log("Importing file from: " + file);
    Entries.importFile(path, file, function(err) {
      if (err)
        $scope.alert({ title: "Error", template: "Error importing from " + file + "<br>\n" + err.message });
      else
        $scope.alert({ title: "Success!", template: "Imported database from " + file });
    });
  };

  $scope.exportFile = function(path, file) {
    console.log("Exporting file to: " + file);
    Entries.exportFile(path, file, function(err) {
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
});
