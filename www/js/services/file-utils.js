
angular.module('diary.services')

.factory('FileUtils', function($cordovaFile, $cordovaFileError, $q, $window) {

  var FileUtils = {

    // Lists files within a directory.
    listDir: function(path, callback) {

      $window.resolveLocalFileSystemURL(path,
      function (fileSystem) {

        var reader = fileSystem.createReader();

        reader.readEntries(
        function (entries) {
          var names = entries.map(function(e) { return e.name });
          console.log("Read files in directory: " + path);
          console.log(JSON.stringify(names, null, 2));
          return callback(null, entries);
        },
        function (err) {
          console.error("Error reading directory entries: " + JSON.stringify(err));
          return callback(err);
        });
      },
      function (err) {
        console.error("Error listing directory: " + JSON.stringify(err));
        return callback(err);
      });
    },

    // Reads metadata for given file.
    readFileMetadata: function(path, file) {
      var q = $q.defer();

      if ((/^\//.test(file))) {
        q.reject('directory cannot start with \/');
      }

      try {
        var directory = path + file;

        $window.resolveLocalFileSystemURL(directory,
        function(fileEntry) {

          fileEntry.file(
          function(result) {
            q.resolve(result);
          },
          function(error) {
            error.message = $cordovaFileError[error.code];
            q.reject(error);
          });
        },
        function(err) {
          err.message = $cordovaFileError[err.code];
          q.reject(err);
        });
      } catch (e) {
        e.message = $cordovaFileError[e.code];
        q.reject(e);
      }

      return q.promise;
    },

    writeFileAsync: function(path, file, data, replace) {
      var q = $q.defer();
      FileUtils.writeFile(path, file, data, replace, function(err) {
        if (err)
          return q.reject(err);
        else
          return q.resolve();
      });
      return q.promise;
    },

    // Writes a file to the file system.
    writeFile: function(path, file, data, replace, callback) {
      $cordovaFile.writeFile(path, file, data, true).then(
      function(success) {
        return callback(null);
      },
      function(error) {
        console.warn("Error on $cordovaFile.writeFile(): " + JSON.stringify(error));
        // Sometimes NO_MODIFICATION_ALLOWED_ERR is incorrect,
        // so check if the file was actually updated!
        if (error.code == 6) {
          FileUtils.readFileMetadata(path, file).then(
          function(metadata) {
            if (Date.now() - metadata.lastModified < 5000) {
              return callback(null);
            }
            else {
              return callback(new Error("Error checking file metadata: " + JSON.stringify(metadata)));
            }
          },
          function(err) {
            return callback(new Error("Error reading file metadata: " + JSON.stringify(err)));
          });
        }
        else {
          return callback(new Error("Error writing file: " + JSON.stringify(error)));
        }
      });
    }
  };

  return FileUtils;
});
