// Nikki

angular.module('nikki', ['ionic', 'nikki.controllers', 'nikki.services', 'nikki.directives'])

.run(function($ionicPlatform, Entries) {
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
      db: function($q, Entries) {
        console.log("Waiting for database...");

        var deferred = $q.defer();
        var waited = 0;
        var waitForFS = function() {
          setTimeout(function() {
            console.log("Waiting for filesystem...")
            if (!window.requestFileSystem && waited < 9000) {
              waited += 500;
              waitForFS();
            }
            else {
              startDB();
            }
          }, 500);
        };

        var startDB = function() {
          Entries.start(function() {
            console.log("Entries.all(): ", Entries.all());

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
      }
    }
  })

  //
  // Tabs
  //

 .state('tab.entries', {
      url: '/entries',
      views: {
        'tab-entries': {
          templateUrl: 'templates/tab-entries.html',
          controller: 'EntriesCtrl'
        }
      }
    })

  .state('tab.entry-detail', {
    url: '/entries/:entryId',
    views: {
      'tab-entries': {
        templateUrl: 'templates/entry-detail.html',
        controller: 'EntryDetailCtrl'
      }
    }
  })

  .state('tab.dash', {
    url: '/dash',
    views: {
      'tab-dash': {
        templateUrl: 'templates/tab-dash.html',
        controller: 'DashCtrl'
      }
    }
  })

 .state('tab.chats', {
      url: '/chats',
      views: {
        'tab-chats': {
          templateUrl: 'templates/tab-chats.html',
          controller: 'ChatsCtrl'
        }
      }
    })

  .state('tab.chat-detail', {
    url: '/chats/:chatId',
    views: {
      'tab-chats': {
        templateUrl: 'templates/chat-detail.html',
        controller: 'ChatDetailCtrl'
      }
    }
  })

  .state('tab.account', {
    url: '/account',
    views: {
      'tab-account': {
        templateUrl: 'templates/tab-account.html',
        controller: 'AccountCtrl'
      }
    }
  });

  // Default Route
  $urlRouterProvider.otherwise('/tab/entries');

});
