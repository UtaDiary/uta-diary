// Diary

angular.module('diary', ['ionic', 'ngCordova', 'monospaced.elastic', 'diary.controllers', 'diary.services', 'diary.directives'])

.run(function($ionicPlatform, Uta, Entries, $ionicConfig) {

  $ionicPlatform.ready(function() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      // Hide the input accessory bar
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // Requires org.apache.cordova.statusbar
      StatusBar.styleLightContent();
    }

    $ionicConfig.tabs.position('top');
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // AngularUI Router States
  $stateProvider

  .state('root', {
    url: "/root",
    abstract: true,
    templateUrl: "templates/root.html",
    controller: 'RootCtrl',
    resolve: {}
  })

  .state('splash', {
    url: '/splash',
    templateUrl: 'templates/splash.html',
    controller: 'SplashCtrl',
    resolve: {}
  })

  // Login
  .state('root.login', {
    url: '/login',
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl',
    resolve: {
      init: function(Uta, Init, $state) {
        return Init.initLoginScreen().then(function() {
          if (!Uta.vault.storage.vault.encrypted) {
            console.log("Skipping login!");
            $state.go('root.start');
          }
        });
      }
    }
  })

  // Start
  .state('root.start', {
    url: '/start',
    templateUrl: 'templates/start.html',
    controller: 'StartCtrl',
    resolve: {
      init: function(Uta, Init, $state) {
        return Init.initStartScreen().then(function() {

          var completedTutorial = Uta.db.events.completeTutorial;
          var createdPassphrase = Uta.db.events.createPassphrase;

          if (!completedTutorial || Uta.db.settings.enableTutorial) {
            return $state.go('root.intro');
          }
          else if (!createdPassphrase) {
            return $state.go('root.passphrase');
          }
          else {
            return $state.go('tab.journal');
          }
        });
      }
    }
  })

  // Tutorial
  .state('root.intro', {
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

  // Passphrase
  .state('root.passphrase', {
    url: '/passphrase',
    templateUrl: 'templates/passphrase.html',
    controller: 'PassphraseCtrl',
    resolve: {}
  })

  // An abstract tab state
  .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html",
    controller: 'TabCtrl',
    resolve: {
      init: function(Uta, Database, Init, $state) {
        return Init.initJournalScreen().then(function(db) {
          console.log('Initialised Uta.db: ', Uta.db);

          if (!Database.validateDB(Uta.db)) {
            $state.go('root.splash');
          }
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

  .state('tab.settings-advanced', {
    url: '/settings/advanced',
    views: {
      'tab-settings': {
        templateUrl: 'templates/tab-settings-advanced.html',
        controller: 'AdvancedCtrl'
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

  .state('tab.settings-privacy', {
    url: '/settings/privacy',
    views: {
      'tab-settings': {
        templateUrl: 'templates/tab-settings-privacy.html',
        controller: 'PrivacyCtrl'
      }
    }
  })

  // Default Route
  $urlRouterProvider.otherwise('/splash');

});
