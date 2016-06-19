angular.module('diary.directives', [])

.factory('Link', function($window, $cordovaInAppBrowser) {
  if (window.require) {
    var {shell} = require('electron');
  }
  var Link = {
    click: function($event) {
      if ($event.target.tagName == "A") {
        Link.open($event.target.href)
        $event.preventDefault();
        return false;
      }
    },
    open: function(url) {
      if (window.require) {
        shell.openExternal(url);
      }
      else {
        $window.open(url, '_system', 'location=yes');
      }
    }
  };
  return Link;
})

.directive('kitsuneEntry', function(Uta, Link) {
  return {
    templateUrl: 'templates/kitsune-entry.html',
    restrict: 'AE',
    scope: {
      entry: '=',
      avatarURL: '='
    },
    link: function($scope, $element, $attrs) {
      $scope.handleClick = function($event) {
        return Link.click($event);
      };
    }
  }
})

.directive('diaryEntry', [function() {
  return {
    templateUrl: 'templates/diary-entry.html',
    restrict: 'AE',
    scope: {
      entry: '='
    },
    link: function($scope, $element, $attrs) {
      $scope.state = {
        editingText: false,
        editingTitle: false,
        originalText: $scope.entry.text
      };
    }
  };
}])

.directive('diaryEntryTitle', function(Uta, $timeout) {
  return {
    templateUrl: 'templates/diary-entry-title.html',
    restrict: 'AE',
    scope: {
      state: '=',
      entry: '='
    },
    link: function($scope, $element, $attrs) {
      var input = $element.find('form').find('input')[0];
      $scope.startTitleEditor = function() {
        $scope.state.editingTitle = true;
        $scope.originalTitle = $scope.entry.title;

        // Focus the input
        $timeout(function() {
          input.focus();
        }, 200);
      };
      $scope.saveTitleChanges = function() {
        $scope.state.editingTitle = false;
        Uta.commit();
      };
    }
  };
})

.directive('diaryEntryText', function(Uta, $timeout, $window, Link) {
  return {
    templateUrl: 'templates/diary-entry-text.html',
    restrict: 'AE',
    scope: {
      state: '=',
      entry: '='
    },
    link: function($scope, $element, $attrs) {
      var textarea = $element.find('form').find('textarea')[0];
      var lastSavedAt = new Date();
      var lastChangedAt = new Date();
      $scope.history = [ $scope.state.originalText ];
      $scope.checkpoint = 1;
      $scope.notifications = [];

      $scope.renderMarkdown = function(text) {
        var converter = new showdown.Converter();
        var html = converter.makeHtml(text);
        return html;
      };
      $scope.startEditor = function($event) {
        // Open links in new window
        if ($event.target.tagName == "A") {
          Link.open($event.target.href);
          $event.preventDefault();
          return false;
        }

        // Show the editor
        $scope.state.editingText = true;
        $scope.state.originalText = $scope.entry.text;

        // Focus the textarea
        $timeout(function() {
          textarea.focus();
        }, 200);
      };
      $scope.textChanged = function() {
        lastChangedAt = new Date();
        $timeout(function() {
          if (Date.now() - lastChangedAt >= 3500) {
            $scope.autosave();
          }
        }, 3500);
      };
      $scope.autosave = function() {
        Uta.commit(function() {
          $scope.saveCheckpoint();
          $scope.notify("Journal saved.");
        });
      };
      $scope.saveCheckpoint = function() {
        $scope.history.splice($scope.checkpoint);
        $scope.history.push($scope.entry.text);
        $scope.checkpoint++;
      };
      $scope.notify = function(message) {
        var notice = {
          message: message,
          start: true
        };
        $scope.notifications.push(notice);
        $timeout(function() { notice.fadeIn = true });
        $timeout(function() { notice.fadeOut = true }, 2000);
        console.log(message);
      };
      $scope.preview = function() {
        $scope.state.editingText = false;
        $scope.autosave();
      };
    }
  };
});
