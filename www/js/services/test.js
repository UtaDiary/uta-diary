
angular.module('diary.services')

.factory('Test', function($timeout) {

  var Uta = null;
  var Test = {

    // Initialises the module.
    init: function(uta) {
      Uta = uta;
      return this;
    },

    // Runs a test.
    runTest: function(test, description) {
      var result = test();
      if (result) console.log("Passed test: " + description);
      else console.error("Failed test: " + description);
      return result;
    },

    // Runs multiple tests.
    runTests: function(tests) {
      var status = true;
      for (var t in tests) {
        var test = tests[t][0];
        var desc = tests[t][1];
        var result = Test.runTest(test, desc);
        if (!result)
          status = false;
      }
      return status;
    },

    // Runs a module of tests.
    runModule: function(module) {
      var tests = module[0];
      var name = module[1];
      var result = Test.runTests(tests);
      if (result) {
        console.log("Passed module: " + name);
      }
      else {
        console.error("Failed module: " + name);
      }
      return result;
    },

    // Runs an asynchronous test.
    runAsyncTest: function(test, description, callback) {
      test(function(err) {
        if (err) {
          console.error("Failed test: " + description);
          console.error("> " + err.message);
          return callback(err);
        }
        else {
          console.log("Passed test: " + description);
          return callback(null);
        }
      });
    },

    // Runs multiple asynchronous tests.
    runAsyncTests: function(tests, callback) {
      var status = true;
      var totalTests = tests.length;
      var totalFinished = 0;
      var running = {};
      var passed = [];
      var failed = [];

      var abort = function() {
        console.error("Aborting...");
        status = false;
        return callback(status);
      };
      
      var timeout = function() {
        if (totalFinished != tests.length) {
          for (var r in running) {
            console.error("Timed Out: " + running[r][1]);
          }
          abort();
        }
      };

      var finishedOne = function() {
        if (totalFinished == tests.length) {
          finishedAll();
        }
      };

      var finishedAll = function() {
        $timeout.cancel(timer);
        status = (passed.length == tests.length);
        return callback(status);
      };

      var runAll = function() {
        for (var t in tests) {
          (function(t) {
            var pair = tests[t];
            var test = tests[t][0];
            var desc = tests[t][1];

            running[t] = pair;

            Test.runAsyncTest(test, desc, function(err) {
              if (err) {
                var fail = running[t];
                failed.push(fail);
                delete running[t];
              }
              else {
                var pass = running[t];
                passed.push(pass);
                delete running[t];
              }
              totalFinished++;
              finishedOne();
            });
          })(t);
        }
      };

      var timer = $timeout(timeout, 9000)
      runAll();
    },

    // Runs an asynchronous module of tests.
    runAsyncModule: function(module, callback) {
      var callback = callback || function() {};
      var tests = module[0];
      var name = module[1];
      Test.runAsyncTests(tests, function(result) {
        if (result) {
          console.log("Passed module: " + name);
          return callback(null);
        }
        else {
          console.error("Failed module: " + name);
          return callback(new Error("Failed module: " + name));
        }
      });
    },

    // Runs all test modules.
    runAll: function(callback) {
      Uta.Database.test();
      Uta.Crypto.test(function(er1) {
        Uta.Vault.test(function(er2) {
          return callback(er1 || er2);
        });
      });
    }
  };

  return Test;
});
