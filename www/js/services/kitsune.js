
angular.module('nikki.services')

.factory('Kitsune', function(Entries, Markov) {
  var markov = new Markov();
  var Kitsune = {
    all: function() {
      return Kitsune.regenerate();
    },
    regenerate: function() {
      markov.reset();
      markov.seed("abcdefghi");
      return Kitsune.generate();
    },
    generate: function() {
      return Entries.all().map(function(entry, i) {
        if (entry.author == 'Kitsune') {
          return entry;
        }
        else {
          markov.train(entry.text);
          var clone = angular.copy(entry);
          var text = markov.generate();
          clone.author = 'Kitsune';
          clone.text = text;
          console.log("Markov text: ", text);
          return clone;
        }
      });
    },
    get: function(entryId) {
      var entries = Kitsune.all();
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].id === parseInt(entryId)) {
          return entries[i];
        }
      }
      return null;
    },
    remove: function(entry) {
      console.log("Skipping removal of auto-generated entry...")
    }
  };
  Uta.Kitsune = Kitsune;
  return Kitsune;
});
