angular.module('nikki.directives', [])

.directive('nikkiEntryTitle', [function() {
  return {
    templateUrl: 'templates/nikki-entry-title.html',
    restrict: 'AE',
    scope: {
      state: '=',
      entry: '='
    },
    link: function($scope, $element, $attrs) {
      $scope.startTitleEditor = function() {
        $scope.state.editingTitle = true;
        $scope.originalTitle = $scope.entry.title;
      };
      $scope.saveTitleChanges = function() {
        $scope.state.editingTitle = false;
      };
    }
  };
}])

.directive('nikkiEntryText', [function() {
  return {
    templateUrl: 'templates/nikki-entry-text.html',
    restrict: 'AE',
    scope: {
      state: '=',
      entry: '='
    },
    link: function($scope, $element, $attrs) {
      $scope.renderMarkdown = function(text) {
        var converter = new showdown.Converter();
        var html = converter.makeHtml(text);
        return html;
      };
      $scope.startEditor = function() {
        $scope.state.editingText = true;
        $scope.state.originalText = $scope.entry.text;
      };
      $scope.saveChanges = function() {
        $scope.state.editingText = false;
        Entries.commit();
      };
      $scope.cancelChanges = function() {
        $scope.state.editingText = false;
        $scope.entry.text = $scope.state.originalText;
      };
    }
  };
}]);
