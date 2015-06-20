angular.module('nikki.directives', [])

.directive('nikkiEntryTitle', [function() {
  return {
    templateUrl: 'templates/entry-title.html',
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
}]);
