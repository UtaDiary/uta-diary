
angular.module('nikki.services')

.factory('Markov', function() {

  // Random generates pseudo-random numbers deterministically from a given seed.
  var Random = function(seed) {
    this.reseed(seed || 1);
  };

  // Generates a floating point value between [0, 1).
  Random.prototype.random = function() {
    var m = 0x1000000000000; // 2 ^ 48
    var a = 25214903917;
    var c = 11;
    this.seed = (this.seed * a + c) % m;
    return this.seed / m;
  };

  // Generates an integer value between [0, max).
  Random.prototype.rand = function(max) {
    return Math.floor(max * this.random());
  };

  // Seeds the generator with given string.
  Random.seedFor = function(string) {
    var number = 0;
    for (var i = 0; i < string.length; i++)
      number += string.charCodeAt(i) << i * 8 % 32;
    return number;
  };

  // Reseeds the generator with a number or string.
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
    this.PRNG = new Random();
    this.unigrams = {};        // Maps each word to an array of next possible words.
    this.bigrams = {};         // Maps each word to next possible words, through previous words.
    this.tokens = [];          // All words seen so far, in order of appearance in training data.
    this.sentenceTexts = [];   // All sentences seen so far, as strings.
    this.sentencesTokens = []; // All sentences seen so far, as arrays of tokens.
    this.sentences = [];       // All sentences seen so far, as arrays of token indices.
    this.paragraphTexts = [];  // All paragraphs, as strings.
    this.paragraphs = [];      // All paragraphs, as arrays of sentence indices.
    this.entries = [];         // All entries, as strings.
    this.entryTexts = [];      // All entries, as arrays of paragraph indices.
    this.tikis = {};           // Reverse map of words to their numeric token index.
  };

  // Resets the instance, including training data and number generator.
  Markov.prototype.reset = function() {
    this.init();
  };

  // Seeds the random number generator with given number or string.
  Markov.prototype.seed = function(seed) {
    this.PRNG.reseed(seed);
  };

  // Trains the generator with given source text.
  Markov.prototype.train = function(sourceText) {
    this.addEntry(sourceText);
  };

  // Adds given entry to the Markov model.
  Markov.prototype.addEntry = function(entryText) {
    var self = this;
    var entry = [];
    var normalized = entryText.replace(/^([#].*)$/gm, "$1\n");
    var paragraphs = normalized.split(/\n\n+/);

    paragraphs.forEach(function(paragraph) {
      self.addParagraph(paragraph);
      entry.push(self.paragraphs.length - 1);
    });

    self.entries.push(entry);
    self.entryTexts.push(entryText);
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
    var entry = '';
    var averageParagraphs = this.paragraphs.length / (this.entries.length || 1);

    for (var i = 0; i < averageParagraphs; i++) {
      entry += this.generateParagraph() + "\n\n";
    }
    return entry;
  };

  // Generates a paragraph with given number of words.
  Markov.prototype.generateParagraph = function(wordCount) {
    var self = this;
    var index = self.PRNG.rand(self.paragraphs.length);
    var paragraph = self.paragraphs[index];
    var sentences = paragraph.map(function(sentenceIndex) {
      return self.sentences[sentenceIndex].slice();
    });

    sentences.forEach(function(sentence, i) {
      sentence.forEach(function(tiki, j) {
        var word = self.tokens[tiki];
        var isPunctuation = /^[,:.!?]+$/.test(word);

        if (isPunctuation) {
          var lastTiki = sentence[j-1];
          var prevWord = self.tokens[lastTiki];
          var replacement = self.randomWord();
          var replacementTiki = self.tikis[replacement];
          sentence[j-1] = replacementTiki;
        }
      });
    });
    var paragraphText = self.buildParagraph(sentences);
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
    return this.PRNG.rand(this.paragraphs.length);
  };

  // Selects a word.
  Markov.prototype.randomWord = function() {
    var tiki = this.PRNG.rand(this.tokens.length);
    var word = this.tokens[tiki];
    return word;
  };

  Uta.Markov = Markov;
  return Markov;
});