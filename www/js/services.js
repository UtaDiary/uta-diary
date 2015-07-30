angular.module('nikki.services', [])

.factory('Entries', function($cordovaFile) {

  var db = {};

  // Example entries
  var examples = {
    welcome: {
      id: 0,
      author: 'Kitsune',
      date: new Date(2015, 06, 17),
      title: 'Welcome!',
      text: "Thanks for using Uta Nikki!\n\nHopefully, these notes will help you get started."
    },
    first: {
      id: 1,
      author: null,
      date: new Date(2015, 06, 02),
      title: 'Looking Forward',
      text: "A few notes to myself on where I'd like to go."
    },
    second: {
      id: 2,
      author: null,
      date: new Date(2015, 06, 01),
      title: 'A New Journal',
      text: "It's nice to start fresh every once in a while!"
    }
  };

  var Entries = {

    // Example entries.
    examples: examples,

    // Gets database object.
    db: function() {
      return db;
    },

    // Gets default database values.
    defaults: function() {
      var defaults = {
        lastWrittenAt: null,
        entries: [ examples.welcome ],
        settings: {
          username: "",
          password: "",
          email: "",
          firstName: "",
          lastName: "",
          enableEncryption: true
        }
      };
      return defaults;
    },

    // Resets entries database.
    reset: function(callback) {
      console.log("Resetting database...");
      db = Entries.defaults();
      return callback(null);
    },

    // Starts entries database.
    start: function(callback) {
      console.log("Starting database");

      ionic.Platform.ready(function() {

        if (!window.cordova) {
          console.log("Skipping entries file detection in browser");
          return Entries.reset(callback);
        }

        console.log("Checking for entries file");
        $cordovaFile.checkFile(cordova.file.externalDataDirectory, "entries.json")
        .then(
          function (success) {
            Entries.reload(callback);
          },
          function (error) {
            console.log("Creating new entries file...")
            $cordovaFile.createFile(cordova.file.externalDataDirectory, "entries.json", false)
            .then(
              function (success) {
                Entries.reload(callback);
              },
              function (error) {
                console.error("Failed creating entries.json");
                return callback(error);
              }
            );
          }
        );
      });
    },

    // Reloads all entries from storage.
    reload: function(callback) {
      console.log("Reloading entries!");

      if (!window.cordova) {
        console.log("Skipping database reload in browser");
        return callback(null);
      }

      $cordovaFile.readAsText(cordova.file.externalDataDirectory, "entries.json")
      .then(
        function (success) {
          console.log("Read entries file: ", success);
          var json = success;
          var result = angular.fromJson(success);

          // Deserialize dates
          var timestamp = Date.parse(result.lastWrittenAt);
          var isValid = !isNaN(timestamp);

          result.lastWrittenAt = isValid
            ? new Date(timestamp)
            : null;

          if (result.lastWrittenAt > db.lastWrittenAt || !db.lastWrittenAt) {
            db = result;
            console.log("Loaded entries database: ", db);
            return callback(null);
          }
          else {
            console.error("Failed loading entries. File older than current data: ", result);
            return callback(new Error);
          }
        },
        function (error) {
          console.error("Failed reading entries: ", error);
          return callback(error);
        }
      );
    },

    // Commits all entries to storage.
    commit: function() {
      console.log("Committing entries!");

      if (!window.cordova) {
        console.log("Skipping database commit in browser");
        return;
      }

      db.lastWrittenAt = new Date();
      var json = angular.toJson(db);

      $cordovaFile.writeFile(cordova.file.externalDataDirectory, "entries.json", json, true)
      .then(
        function (success) {
          console.log("Finished saving database!");
          console.log("json: ", json);
        },
        function (error) {
          console.error("Error saving database: ", error);
        }
      );
    },

    // Gets all journal entries as an array.
    all: function() {
      return db.entries;
    },

    // Gets the most recently created journal entry.
    last: function() {
      return db.entries[db.entries.length - 1];
    },

    // Gets the next journal entry id.
    nextId: function() {
      return db.entries.length > 0
        ? Entries.last().id + 1
        : 0;
    },

    // Creates a new journal entry.
    create: function(options) {
      console.log("Creating entry!");
      options = arguments[0] || {};
      var entry = {
        id: options.id || Entries.nextId(),
        author: null,
        date: options.date || new Date(),
        text: options.text || "What's on my mind today?",
        title: options.title || "Title"
      };
      console.log("entry: ", entry);
      db.entries.push(entry);
      return entry;
    },

    // Removes a given entry object.
    remove: function(entry) {
      db.entries.splice(db.entries.indexOf(entry), 1);
    },

    // Gets a journal entry by id.
    get: function(entryId) {
      for (var i = 0; i < db.entries.length; i++) {
        if (db.entries[i].id === parseInt(entryId)) {
          return db.entries[i];
        }
      }
      return null;
    },

    // Gets statistics for series of entries.
    getStatsForSeries: function(series) {
      var stats = {
        bytes: 0,
        entries: 0,
        words: 0
      };
      for (var i = 0; i < series.length; i++) {
        var entry = series[i];
        var text = entry.text;
        var words = text.split(/ +/);
        stats.bytes += text.length;
        stats.entries += 1;
        stats.words += words.length;
      }
      return stats;
    },

    // Gets statistics for database entries.
    getStats: function() {
      var stats = {
        daily: {},
        weekly: {},
        monthly: {},
        yearly: {},
        allTime: {}
      };
      var groups = {
        daily: [],
        weekly: [],
        monthly: [],
        yearly: [],
        allTime: []
      };
      for (var i = 0; i < db.entries.length; i++) {
        var today = new Date();
        var entry = db.entries[i];
        var date = entry.date;
        var days = 24 * 3600 * 1000;

        // Naive rolling stats, for now...
        if (today - date < 1 * days) groups.daily.push(entry);
        if (today - date < 7 * days) groups.weekly.push(entry);
        if (today - date < 30 * days) groups.monthly.push(entry);
        if (today - date < 365 * days) groups.yearly.push(entry);
        groups.allTime.push(entry);
      }
      stats.daily   = Entries.getStatsForSeries(groups.daily);
      stats.weekly  = Entries.getStatsForSeries(groups.weekly);
      stats.monthly = Entries.getStatsForSeries(groups.monthly);
      stats.yearly  = Entries.getStatsForSeries(groups.yearly);
      stats.allTime = Entries.getStatsForSeries(groups.allTime);
      return stats;
    }
  };

  return Entries;
})

.factory('Markov', function() {

  var Random = function(seed) {
    this.reseed(seed || 1);
  };

  Random.prototype.random = function() {
    var m = 0x1000000000000; // 2 ^ 48
    var a = 25214903917;
    var c = 11;
    this.seed = (this.seed * a + c) % m;
    return this.seed / m;
  };

  Random.seedFor = function(string) {
    var number = 0;
    for (var i = 0; i < string.length; i++)
      number += string.charCodeAt(i) << i * 8 % 32;
    return number;
  };

  Random.prototype.reseed = function(seed) {
    this.seed = (typeof seed == 'string')
      ? Random.seedFor(seed)
      : seed;
  };

  // Markov generates human-readable content which is derived
  // probabilistically from any text sources provided as training input.
  //
  // Example:
  //
  //    // Create a new markov instance.
  //    var markov = new Markov();
  //
  //    // Seed the random number generator.
  //    // This optional step allows deterministic output.
  //    markov.seed(123);
  //
  //    // Provide some training texts.
  //    markov.train("The first text is short");
  //    markov.train("The second text is slightly longer");
  //
  //    // Generate text of average input length.
  //    var result1 = markov.generate();
  //
  //    // Generate text with length of 20 words.
  //    var result2 = markov.generate(20);
  //
  var Markov = function() {
    this.init();
  };

  // Initialises the instance.
  Markov.prototype.init = function() {
    this.randomGenerator = new Random();
    this.unigrams = {};        // Maps each word to an array of next possible words.
    this.bigrams = {};         // Maps each word to next possible words, through previous words.
    this.tokens = [];          // All words seen so far, in order of appearance in training data.
    this.sentenceTexts = [];   // All sentences seen so far, as strings.
    this.sentencesTokens = []; // All sentences seen so far, as arrays of tokens.
    this.sentences = [];       // All sentences seen so far, as arrays of token indices.
    this.paragraphTexts = [];  // All paragraphs, as strings.
    this.paragraphs = [];      // All paragraphs, as arrays of sentence indices.
    this.tikis = {};           // Reverse map of words to their numeric token index.
  };

  // Resets the instance, including training data and number generator.
  Markov.prototype.reset = function() {
    this.init();
  };

  // Seeds the random number generator with given number or string.
  Markov.prototype.seed = function(seed) {
    this.randomGenerator.reseed(seed);
  };

  // Trains the generator with given source text.
  Markov.prototype.train = function(sourceText) {
    var paragraphTexts = sourceText.split(/\n\n+/);

    for (var i = 0; i < paragraphTexts.length; i++) {
      this.addParagraph(paragraphTexts[i]);
    }
  };

  // Adds given paragraph to the Markov model.
  Markov.prototype.addParagraph = function(paragraphText) {
    var sentences = paragraphText.split(/([.!?]+)\B\s*/);
    var paragraph = [];

    for (var i = 0; i < sentences.length; i++) {
      var sentence = sentences[i];

      // Keep punctuation at sentence end.
      while (/^[.!?]+$/.test(sentences[i + 1])) {
        sentence += sentences[i + 1];
        i++;
      }

      if (sentence) {
        this.addSentence(sentence);
        paragraph.push(this.sentences.length - 1);
      }
    }
    // Add paragraph entries.
    this.paragraphTexts.push(paragraphText);
    this.paragraphs.push(paragraph);
  };

  // Adds given sentence to the Markov model.
  Markov.prototype.addSentence = function(sentence) {
    var self = this;
    var tokens = sentence.split(/\s+/);

    // Split words followed by punctuation into two tokens.
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var parts = token.match(/(\S*\w+)([,:.!?]+)$/);
      if (parts) {
        var word = parts[1];
        var punctuation = parts[2];
        tokens.splice(i, 1, word, punctuation);
      }
    }

    // Add each token.
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var nextToken = tokens[i + 1];
      var prevToken = tokens[i - 1];
      self.addToken(token, nextToken, prevToken);
    }

    // Build token indices for sentence.
    var tikis = tokens.map(function(t) { return self.tikis[t] });

    // Add sentence in various forms.
    this.sentenceTexts.push(sentence);
    this.sentencesTokens.push(tokens);
    this.sentences.push(tikis);
  };

  // Adds given token to the Markov model.
  Markov.prototype.addToken = function(token, nextToken, prevToken) {
    var START = '_START';
    var END = '_END';
    nextToken = nextToken || END;
    prevToken = prevToken || START;

    // Add new tokens on first encounter
    var index = this.tikis[token];
    if (!index) {
      this.tokens.push(token);
      this.tikis[token] = this.tokens.length - 1;
      this.unigrams[token] = [];
      this.bigrams[token] = {};
    }

    // Add unigram and bigram entries.
    this.unigrams[token].push(nextToken);
    this.bigrams[token][prevToken] = this.bigrams[token][prevToken] || [];
    this.bigrams[token][prevToken].push(nextToken);
  };

  // Generates an entry with given number of words.
  Markov.prototype.generate = function(wordCount) {
    return this.generateParagraph();
  };

  // Generates a paragraph with given number of words.
  Markov.prototype.generateParagraph = function(wordCount) {
    var self = this;

    // Select a random paragraph.
    var piki = this.randomPiki();
    var paragraph = this.paragraphs[piki];

    // Get token indices for paragraph sentences.
    var sentences = paragraph.map(function(siki) {
      return self.sentences[siki].slice();
    });

    // Loop through sentences
    for (var i = 0; i < sentences.length; i++) {
      var sentenceTikis = sentences[i];

      // Loop through token indices
      for (var j = 1; j < sentenceTikis.length; j++) {
        var tiki = sentenceTikis[j];
        var word = this.tokens[tiki];
        var isPunctuation = /^[,:.!?]+$/.test(word);

        // Replace words before punctuation
        if (isPunctuation) {
          var lastTiki = sentenceTikis[j-1];
          var prevWord = this.tokens[lastTiki];
          var replacement = this.randomWord();
          var replacementTiki = this.tikis[replacement];
          sentenceTikis[j-1] = replacementTiki;
        }
      }
    }

    var paragraphText = this.buildParagraph(sentences);
    return paragraphText;
  };

  // Builds a paragraph string from token indices for sentences.
  Markov.prototype.buildParagraph = function(sentences) {
    var paragraph = "";
    for (var i = 0; i < sentences.length; i++) {
      var sentenceTikis = sentences[i];

      for (var j = 0; j < sentenceTikis.length; j++) {
        var tiki = sentenceTikis[j];
        var word = this.tokens[tiki];
        var nextTiki = sentenceTikis[j + 1];
        var nextToken = this.tokens[nextTiki];
        var isPunctuation = /^[,:.!?]+$/.test(nextToken);

        if (isPunctuation) {
          paragraph += word + nextToken + ' ';
          j++;
        }
        else {
          paragraph += word + ' ';
        }
      }
    }
    return paragraph;
  }

  // Selects a random paragraph index.
  Markov.prototype.randomPiki = function() {
    return Math.floor(this.randomGenerator.random() * (this.paragraphs.length - 1));
  };

  // Selects a word.
  Markov.prototype.randomWord = function() {
    var tiki = Math.floor(this.randomGenerator.random() * (this.tokens.length - 1));
    var word = this.tokens[tiki];
    return word;
  };

  return Markov;
})

.factory('Kitsune', function(Entries, Markov) {
  var markov = new Markov();
  var Kitsune = {
    all: function() {
      return Kitsune.regenerate();
    },
    regenerate: function() {
      markov.reset();
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
  return Kitsune;
});
