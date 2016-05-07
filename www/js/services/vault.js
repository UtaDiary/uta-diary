
angular.module('diary.services')

.factory('Vault', function($q, Crypto, Test) {

  var Uta = null;

  /**
   * The Vault class stores passphrase-encrypted data,
   * for decryption with the passphrase at a later time.
   *
   * Vaults can be serialized and deserialized as JSON,
   * useful for saving encrypted vaults to the filesystem.
   *
   * Example:
   *
   *    // Create a new vault
   *    var vault = new Vault();
   *
   *    // Store data with encrypted with passphrase
   *    vault.store( passphrase, data )
   *
   *    // Retrieve data after decryption
   *    vault.retrieve( passphrase )
   *
   *    // Serialize the vault to JSON
   *    var json = vault.serialize();
   *
   *    // Deserialize from JSON
   *    vault.deserialize( json );
   *
   */
  var Vault = function() {};

  Vault.version = 1;

  Vault.prototype = {

    // Storage for this vault.
    storage: {
      vault: {
        version: Vault.version,
        encrypted: false
      },
      salt: null,
      encryptionAlgorithm: null,
      signatureAlgorithm: null,
      ciphertext: null,
      signature: null
    },

    // Constructs new vault instances.
    constructor: Vault,

    // Gets current salt value.
    salt: function() {
      return this.storage.salt;
    },

    // Generates a new salt value;
    generateSalt: function() {
      return Crypto.generateSalt(16);
    },

    // Stores vault data after encryption with passphrase.
    store: function(passphrase, data) {
      var q = $q.defer();
      var self = this;
      var salt = self.salt() || self.generateSalt();
      var plaintext = angular.toJson(data);

      Crypto.deriveKeys(passphrase, salt, function(err, keys) {
        if (err) return q.reject(err);

        Crypto.encrypt(keys.encryptionKey, plaintext, function(err, message) {
          if (err) return q.reject(err);

          Crypto.sign(keys.signingKey, message.ciphertext, function(err, signature) {
            if (err) return q.reject(err);

            self.storage = {
              vault: {
                version: Vault.version,
                encrypted: true
              },
              salt: salt,
              encryptionAlgorithm: message.algorithm,
              signatureAlgorithm: 'HMAC',
              ciphertext: message.ciphertext,
              signature: signature
            };

            return q.resolve(self.storage);
          })
        });
      });

      return q.promise;
    },

    // Retrieves vault after decryption with passphrase.
    retrieve: function(passphrase) {
      var q = $q.defer();
      var self = this;
      var salt = self.storage.salt;
      var algorithm = self.storage.encryptionAlgorithm;
      var ciphertext = self.storage.ciphertext;
      var signature = self.storage.signature;

      Crypto.deriveKeys(passphrase, salt, function(err, keys) {
        if (err) return q.reject(err);

        var signingKey = keys.signingKey;
        var encryptionKey = keys.encryptionKey

        Crypto.verify(signingKey, ciphertext, signature, function(err, isValid) {
          if (err) return q.reject(err);

          if (!isValid)
            console.warn("Invalid signature detected for vault: " + self.serialize());

          Crypto.decrypt(encryptionKey, ciphertext, algorithm, function(err, plaintext) {
            if (err) return q.reject(err);

            var json = plaintext;
            var data = angular.fromJson(json);

            return q.resolve(data);
          });
        });
      });

      return q.promise;
    },

    // Serializes this vault to plain object data.
    toJSON: function() {
      return JSON.parse(
        JSON.stringify(this.storage, null, '  ')
      );
    },

    // Inflates deserialized values to proper types.
    inflate: function() {
      this.inflateSalt();
      this.inflateIV();
    },

    // Inflates deserialized salt.
    inflateSalt: function() {
      var salt = this.storage.salt;
      if (salt)  this.storage.salt = Vault.inflateTypedArray(salt);
    },

    // Inflates deserialized initialization vector.
    inflateIV: function() {
      var iv = this.storage.encryptionAlgorithm.iv;
      if (iv)  this.storage.encryptionAlgorithm.iv = Vault.inflateTypedArray(iv);
    },

    // Serializes this vault to JSON string.
    serialize: function() {
      return JSON.stringify(this.storage, null, '  ');
    },

    // Deserializes a vault from JSON string.
    deserialize: function(string) {
      this.storage = JSON.parse(string);
      this.inflate();
    }
  };

  // Static Methods
  _.extend(Vault, {

    // Initialises the module.
    init: function(uta) {
      Uta = uta;
      return this;
    },

    // Inflates JSON data to Uint8Array.
    inflateTypedArray: function(object) {
      var keys = _.keys(object);
      var length = keys.length;
      var array = new Uint8Array(length);
      for (var i = 0; i < length; i++) {
        array[i] = object[i];
      }
      return array;
    },

    // Tests storage of data encrypted with passphrase.
    testStore: function(done) {
      var vault = new Vault();
      var passphrase = 'test';
      var data = Uta.Database.defaults();
      vault.store(passphrase, data)
      .then(
        function() {
          if (! vault.storage.vault.version == Vault.version)
            return done(new Error("Version should be included in vault storage"));

          if (! vault.storage.vault.encrypted == true)
            return done(new Error("Encryption status should be true"));

          if (! vault.storage.salt instanceof Uint8Array)
            return done(new Error("Salt should be an typed array"));

          if (! vault.storage.encryptionAlgorithm.name == 'AES-CBC')
            return done(new Error("Encryption algorithm should be AES"));

          if (! vault.storage.encryptionAlgorithm.iv instanceof Uint8Array)
            return done(new Error("Encryption initialization vector should be a typed array"));

          if (! vault.storage.signatureAlgorithm == 'HMAC')
            return done(new Error("Signature algorithm should be HMAC"));

          if (! vault.storage.ciphertext.match(/[a-zA-Z0-9/+=]+/))
            return done(new Error("Ciphertext should be Base64 encoded"));

          if (! vault.storage.signature.match(/[a-zA-Z0-9/+=]+/))
            return done(new Error("Signature should be Base64 encoded"));

          return done();
        }
      )
      .catch(
        function(err) {
          return done(err);
        }
      );
    },

    testRetrieve: function(done) {
      var vault = new Vault();
      var passphrase = 'test';
      var data = Uta.Database.defaults();
      vault.store(passphrase, data)
      .then(
        function() {
          return vault.retrieve(passphrase);
        }
      )
      .then(
        function(result) {
          for (var e in result.entries) {
            var entry = result.entries[e];
            entry.date = new Date(entry.date);
          }

          if (! _.isEqual(result, data))
            return done(new Error("Vault retrieval should match stored data"));

          return done();
        }
      )
      .catch(
        function(err) {
          return done(err);
        }
      );
    },

    testSerialize: function(done) {
      var vault = new Vault();
      var json = vault.serialize();
      var data = JSON.parse(json);

      if (! _.isEqual(data, Vault.prototype.storage))
        return done(new Error("Serialized data should match storage in prototype"));

      return done();
    },

    testDeserialize: function(done) {
      var vault = new Vault();
      var passphrase = 'test';
      var data = Uta.Database.defaults();
      vault.store(passphrase, data)
      .then(
        function() {
          var vault2 = new Vault();
          var json = vault.serialize();
          vault2.deserialize(json);
          return vault2.retrieve(passphrase);
        }
      )
      .then(
        function(result) {
          for (var e in result.entries) {
            var entry = result.entries[e];
            entry.date = new Date(entry.date);
          }

          if (! _.isEqual(result, data))
            return done(new Error("Deserialized vault should retrieve stored data"));

          return done();
        }
      )
      .catch(
        function(err) {
          return done(err)
        }
      );
    },

    // Tests encryption methods.
    testVault: function(callback) {
      var tests = [
        [Vault.testStore, "Should store data encrypted with given passphrase"],
        [Vault.testRetrieve, "Should retrieve data decrypted with given passphrase"],
        [Vault.testSerialize, "Should serialise vault to JSON"],
        [Vault.testDeserialize, "Should deserialise vault from JSON"]
      ];
      var module = [tests, "Vault Tests"];
      Uta.Test.runAsyncModule(module, callback);
    },

    // Test this module.
    test: function(callback) {
      Vault.testVault(callback);
    }
  });

  return Vault;
});
