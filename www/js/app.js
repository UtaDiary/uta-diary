// Diary

angular.module('diary', ['ionic', 'ngCordova', 'monospaced.elastic', 'diary.controllers', 'diary.services', 'diary.directives'])

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

  // Start
  .state('start', {
    url: '/start',
    templateUrl: 'templates/start.html',
    controller: 'StartCtrl',
    resolve: {
      init: function(Uta, Init, $state) {
        return Init.initStartScreen().finally(function() {

          var databaseExists =
            Uta.db &&
            Uta.db.settings &&
            Uta.db.settings.enableEncryption === false;

          var vaultExists =
            Uta.vault.storage.salt &&
            Uta.vault.storage.ciphertext &&
            Uta.vault.storage.vault.encrypted === true;

          if (databaseExists || vaultExists) {
            console.log("Skipping start!");
            $state.go('login');
          }
        });
      }
    }
  })

  // Login
  .state('login', {
    url: '/login',
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl',
    resolve: {
      init: function(Uta, Init, $state) {
        return Init.initLoginScreen().then(function(db) {
          if (!Uta.vault.storage.vault.encrypted) {
            console.log("Skipping login!");
            $state.go('intro');
          }
        });
      }
    }
  })

  // Tutorial
  .state('intro', {
    url: '/intro',
    templateUrl: 'templates/intro.html',
    controller: 'IntroCtrl',
    resolve: {
      init: function(Uta, Init, $state) {
        return Init.initIntroScreen().then(function(db) {
          if (!Uta.db.settings.enableTutorial) {
            console.log("Skipping tutorial!");
            $state.go('tab.journal');
          }
        });
      }
    }
  })

  // An abstract tab state
  .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html",
    resolve: {
      init: function(Uta, Init, $state) {
        return Init.initJournalScreen().then(function(db) {
          console.log('Initialised Uta.db: ', Uta.db);
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
  $urlRouterProvider.otherwise('/start');

});
