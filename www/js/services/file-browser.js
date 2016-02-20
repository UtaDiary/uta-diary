
angular.module('nikki.services')

.factory('FileBrowser', function($q) {
  var FileBrowser = {
    chooseFile: function(fileExt) {
      var pattern = new RegExp(fileExt + '$', 'i');
      var deferred = $q.defer();
      var success = function (uri) {
        if (uri.match(pattern)) {
          console.log("Selecting file: " + uri);
          deferred.resolve(uri);
        }
        else {
          deferred.reject('wrong_file_type');
        }
      };
      var error = function (error) {
        console.error("Error selecting file: " + JSON.stringify(error));
        deferred.reject('cancelled');
      };
      // iOS 8+: https://github.com/jcesarmobile/FilePicker-Phonegap-iOS-Plugin
      // Android: https://github.com/don/cordova-filechooser
      if (ionic.Platform.isIOS()) {
        FilePicker.pickFile(success, error);
      }
      else {
        fileChooser.open(success, error);
      }
      return deferred.promise;
    }
  };
  Uta.FileBrowser = FileBrowser;
  return FileBrowser;
});
