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

  // An abstract tab state
  .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html",
    resolve: {
      db: function($q, Entries, welcomeText) {
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
              startDB();
            }
          }, 500);
        };

        var startDB = function() {
          Entries.examples.welcome.text = welcomeText;
          Entries.start(function(err) {
            if (err) return console.error(err.message);
            console.log("Initial entries: ", Entries.all());

            // Check for existing entries
            if (Entries.all().length == 0) {
              // Add a welcome entry
              Entries.create(Entries.examples.welcome);
              Entries.commit();
            }

            deferred.resolve(Entries.db());
          });
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
  $urlRouterProvider.otherwise('/tab/journal');

});
