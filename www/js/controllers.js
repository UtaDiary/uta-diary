angular.module('nikki.controllers', [])

.controller('DashCtrl', function($scope) {})

.controller('EntriesCtrl', function($scope, Entries) {
  $scope.entries = Entries.all();
  $scope.create = function() {
    var options = {
      date: new Date(),
      title: "Title"
    };
    var entry = Entries.create(options);
    console.log("Creating entry!");
    console.log("entry: ", entry);
  };
  $scope.remove = function(chat) {
    Entries.remove(chat);
  };
})

.controller('ChatsCtrl', function($scope, Chats) {
  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('EntryDetailCtrl', function($scope, $stateParams, Entries) {
  $scope.Entries = Entries;
  $scope.entry = Entries.get($stateParams.entryId);
  $scope.state = {
    editingText: false,
    editingTitle: false,
    originalText: $scope.entry.text
  };
  $scope.renderMarkdown = function(text) {
    var converter = new showdown.Converter();
    var html = converter.makeHtml(text);
    return html;
  };
  $scope.startTitleEditor = function() {
    $scope.state.editingTitle = true;
    $scope.originalTitle = $scope.entry.title
  };
  $scope.saveTitleChanges = function() {
    $scope.state.editingTitle = false
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
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
