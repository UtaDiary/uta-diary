// Nikki

angular.module('nikki', ['ionic', 'ngCordova', 'monospaced.elastic', 'nikki.controllers', 'nikki.services', 'nikki.directives'])

.run(function($ionicPlatform, Uta, Entries) {
  $ionicPlatform.ready(function() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      // Hide the input accessory bar
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // Requires org.apache.cordova.statusbar
      StatusBar.styleLightContent();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // AngularUI Router States
  $stateProvider

  // Tutorial
  .state('intro', {
    url: '/intro',
    templateUrl: 'templates/intro.html',
    controller: 'IntroCtrl'
  })

  // An abstract tab state
  .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html",
    resolve: {
      db: function($q, Uta, welcomeText) {
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
                runTests();
                deferred.resolve(db);
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

        var runTests = function() {
          if (Uta.db.settings.enableDebug == true) {
            Uta.Database.test();
          }
        };

        waitForFS();
        return deferred.promise;
      },
      welcomeText: function($http) {
        console.log("Loading welcome text...");
        return $http.get('./templates/welcome.md').then(function(response) {
          return response.data;
        });
      }
    }
  })

  //
  // Tabs
  //

 .state('tab.journal', {
      url: '/journal',
      views: {
        'tab-journal': {
          templateUrl: 'templates/tab-journal.html',
          controller: 'JournalCtrl'
        }
      }
    })

  .state('tab.journal-detail', {
    url: '/journal/:entryId',
    views: {
      'tab-journal': {
        templateUrl: 'templates/journal-detail.html',
        controller: 'JournalDetailCtrl'
      }
    }
  })

  .state('tab.stats', {
    url: '/stats',
    views: {
      'tab-stats': {
        templateUrl: 'templates/tab-stats.html',
        controller: 'StatsCtrl'
      }
    }
  })

 .state('tab.kitsune', {
      url: '/kitsune',
      views: {
        'tab-kitsune': {
          templateUrl: 'templates/tab-kitsune.html',
          controller: 'KitsuneCtrl'
        }
      }
    })

  .state('tab.kitsune-detail', {
    url: '/kitsune/:kitsuneId',
    views: {
      'tab-kitsune': {
        templateUrl: 'templates/kitsune-detail.html',
        controller: 'KitsuneDetailCtrl'
      }
    }
  })

  .state('tab.settings', {
    url: '/settings',
    views: {
      'tab-settings': {
        templateUrl: 'templates/tab-settings.html',
        controller: 'SettingsCtrl'
      }
    }
  })

  .state('tab.settings-backups', {
    url: '/settings/backups',
    views: {
      'tab-settings': {
        templateUrl: 'templates/tab-settings-backups.html',
        controller: 'BackupsCtrl'
      }
    }
  })

  .state('tab.settings-profile', {
    url: '/settings/profile',
    views: {
      'tab-settings': {
        templateUrl: 'templates/tab-settings-profile.html',
        controller: 'ProfileCtrl'
      }
    }
  })

  // Default Route
  $urlRouterProvider.otherwise('/intro');

});
