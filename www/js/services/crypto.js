
angular.module('diary.services')

.factory('Base58', function() {
  var alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  var basex = BaseX(alphabet);
  // Note, base-x uses opposite naming convention,
  // so we swap "encode" and "decode" methods
  // to match Unibabel and TextEncoder.
  var Base58 = {
    encode: basex.decode,
    decode: basex.encode
  };
  return Base58;
})

.factory('Crypto', function(Test, Base58) {

  var Uta = null;
  var Crypto = {

    // Initialises the module.
    init: function(uta) {
      Uta = uta;
      return this;
    },

    // Encodes UTF-8 string as a Uint8Array.
    encodeUTF8: function(string) {
      var array = Unibabel.utf8ToBuffer(string);
      return array;
    },

    // Decodes Uint8Array as a UTF-8 string.
    decodeUTF8: function(array) {
      var string = Unibabel.bufferToUtf8(array);
      return string;
    },

    // Encodes Base64 string as a Uint8Array.
    encodeBase64: function(string) {
      var array = Unibabel.base64ToBuffer(string);
      return array;
    },

    // Decodes Uint8Array as a Base64 string.
    decodeBase64: function(array) {
      var string = Unibabel.bufferToBase64(array);
      return string;
    },

    // Encodes Base58 string as a Uint8Array.
    encodeBase58: function(string) {
      var array = Base58.encode(string);
      return array;
    },

    // Decodes Uint8Array as a Base58 string.
    decodeBase58: function(array) {
      var string = Base58.decode(array);
      return string;
    },

    // Encodes hexadecimal string as a Uint8Array.
    encodeHex: function(string) {
      var array = Unibabel.hexToBuffer(string);
      return array;
    },

    // Decodes Uint8Array as a hexadecimal string.
    decodeHex: function(array) {
      var string = Unibabel.bufferToHex(array);
      return string;
    },

    // Generates initialization vector with given length in bytes.
    generateIV: function(length) {
      var iv = new Uint8Array(length);
      window.crypto.getRandomValues(iv);
      return iv;
    },

    // Generates random salt with given length in bytes.
    generateSalt: function(length) {
      var salt = new Uint8Array(length);
      window.crypto.getRandomValues(salt);
      return salt;
    },

    // Derives an encryption key from passphrase and salt.
    deriveKey: function(passphrase, salt, callback) {
      var data = Crypto.encodeUTF8(passphrase);
      window.crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveKey'])
      .then(
        function(key) {
          var derivationAlgo = { name: 'PBKDF2', salt: salt, iterations: 1e4, hash: 'SHA-256' };
          var initialKey = key;
          var derivedKeyAlgo = { name: 'AES-CBC', length: 256 };
          var extractable = true;
          var usages = [ 'encrypt', 'decrypt', 'wrapKey', 'unwrapKey' ];
          return window.crypto.subtle.deriveKey(
            derivationAlgo, initialKey, derivedKeyAlgo, extractable, usages
          );
        }
      )
      .then(
        function(derivedKey) {
          return callback(null, derivedKey);
        }
      )
      .catch(
        function(err) {
          return callback(
            new Error("Failed deriving encryption key: " + err.message)
          );
        }
      );
    },

    // Derives encryption and signing keys from passphrase and salt.
    deriveKeys: function(passphrase, salt, callback) {

      Crypto.deriveParentKey(passphrase, salt, function(err, parentKey) {
        if (err) return callback(new Error("Failed deriving keys: " + err.message));

        Crypto.deriveEncryptionKey(parentKey, salt, function(err, encryptionKey) {
          if (err) return callback(new Error("Failed deriving keys: " + err.message));

          Crypto.deriveSigningKey(parentKey, salt, function(err, signingKey) {
            if (err) return callback(new Error("Failed deriving keys: " + err.message));

            var keys = {
              parentKey: parentKey,
              encryptionKey: encryptionKey,
              signingKey: signingKey
            };
            return callback(null, keys);
          });
        });
      });
    },

    // Derives a key from passphrase and salt.
    deriveParentKey: function(passphrase, salt, callback) {
      var data = Crypto.encodeUTF8(passphrase);
      window.crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveKey', 'deriveBits'])
      .then(
        function(key) {
          var derivationAlgo = { name: 'PBKDF2', salt: salt, iterations: 1e4, hash: 'SHA-256' };
          var initialKey = key;
          var length = 256;
          return window.crypto.subtle.deriveBits(
            derivationAlgo, initialKey, length
          );
        }
      )
      .then(
        function(buffer) {
          var array = new Uint8Array(buffer);
          return window.crypto.subtle.importKey('raw', array, 'HKDF', true, ['deriveKey', 'deriveBits']);
        }
      )
      .then(
        function(parentKey) {
          return callback(null, parentKey);
        }
      )
      .catch(
        function(err) {
          return callback(
            new Error("Failed deriving parent key: " + err.message)
          );
        }
      );
    },

    // Derives signing key from a parent key.
    deriveSigningKey: function(parentKey, salt, callback) {
      var info = Crypto.encodeUTF8('MAC-Key');
      var derivationAlgo = { name: 'HKDF', hash: 'SHA-256', salt: salt, info: info };
      var initialKey = parentKey;
      var derivedKeyAlgo = { name: 'HMAC', hash: 'SHA-256', length: 256 };
      var extractable = true;
      var usages = [ 'sign', 'verify' ];
      window.crypto.subtle.deriveKey(
        derivationAlgo, initialKey, derivedKeyAlgo, extractable, usages
      )
      .then(
        function(signingKey) {
          return callback(null, signingKey)
        }
      )
      .catch(
        function(err) {
          return callback(
            new Error("Failed deriving signing key: " + err.message)
          );
        }
      );
    },

    // Derives encryption key from a parent key.
    deriveEncryptionKey: function(parentKey, salt, callback) {
      var info = Crypto.encodeUTF8('AES-Key');
      var derivationAlgo = { name: 'HKDF', hash: 'SHA-256', salt: salt, info: info };
      var initialKey = parentKey;
      var derivedKeyAlgo = { name: 'AES-CBC', length: 256 };
      var extractable = true;
      var usages = [ 'encrypt', 'decrypt', 'wrapKey', 'unwrapKey' ];
      window.crypto.subtle.deriveKey(
        derivationAlgo, initialKey, derivedKeyAlgo, extractable, usages
      )
      .then(
        function(encryptionKey) {
          return callback(null, encryptionKey)
        }
      )
      .catch(
        function(err) {
          return callback(
            new Error("Failed deriving encryption key: " + err.message)
          );
        }
      );
    },

    // Encrypts plaintext with given key.
    encrypt: function(key, plaintext, callback) {
      var iv = Crypto.generateIV(16);
      var algo = { name: 'AES-CBC', iv: iv };
      var data = Crypto.encodeUTF8(plaintext);
      window.crypto.subtle.encrypt(algo, key, data)
      .then(
        function(buffer) {
          var array = new Uint8Array(buffer);
          var ciphertext = Crypto.decodeBase64(array);
          var result = {
            algorithm: algo,
            ciphertext: ciphertext
          };
          return callback(null, result);
        }
      )
      .catch(
        function(err) {
          return callback(new Error("Failed encryption: " + err.message));
        }
      );
    },

    // Decrypts ciphertext with given key.
    decrypt: function(key, ciphertext, algorithm, callback) {
      var data = Crypto.encodeBase64(ciphertext);
      window.crypto.subtle.decrypt(algorithm, key, data)
      .then(
        function(buffer) {
          var array = new Uint8Array(buffer);
          var plaintext = Crypto.decodeUTF8(array);
          callback(null, plaintext);
        }
      )
      .catch(
        function(err) {
          return callback(new Error("Failed decryption: " + err.message));
        }
      )
    },

    // Signs message with given key.
    sign: function(key, message, callback) {
      var algorithm = 'HMAC';
      var messageData = Crypto.encodeBase64(message);
      window.crypto.subtle.sign(algorithm, key, messageData)
      .then(
        function(buffer) {
          var array = new Uint8Array(buffer);
          var signature = Crypto.decodeBase64(array);
          return callback(null, signature);
        }
      )
      .catch(
        function(err) {
          return callback(new Error("Failed signing: " + err.message));
        }
      )
    },

    // Verifies signature for message with given key.
    verify: function(key, message, signature, callback) {
      var algorithm = 'HMAC';
      var messageData = Crypto.encodeBase64(message);
      var signatureData = Crypto.encodeBase64(signature);
      window.crypto.subtle.verify(algorithm, key, signatureData, messageData)
      .then(
        function(isValid) {
          return callback(null, isValid);
        }
      )
      .catch(
        function(err) {
          return callback(new Error("Failed verification: " + err.message));
        }
      )
    },

    // Exports the given key.
    exportKey: function(key, callback) {
      var format = 'raw';
      window.crypto.subtle.exportKey(format, key)
      .then(
        function(buffer) {
          array = new Uint8Array(buffer);
          exported = Crypto.decodeBase58(array);
          return callback(null, exported);
        }
      )
      .catch(
        function(err) {
          return callback(new Error("Failed exporting key: " + err.message));
        }
      )
    },

    // Tests generation of random salt.
    testSalt: function(done) {
      var salt = Crypto.generateSalt(16);
      if (salt.length != 16)
        return done(new Error("Generated salt length should be 16 bytes"));

      return done();
    },

    // Tests derivation of keys from passphrase and salt.
    testDeriveKeys: function(done) {
      var passphrase = 'test';
      var salt = Crypto.generateSalt(16);
      Crypto.deriveKeys(passphrase, salt, function(err, keys) {
        if (err) return done(err);

        if (! keys)
          return done(new Error("The keys should be returned"));

        if (! keys.parentKey instanceof CryptoKey)
          return done(new Error("The parent key should be an instance of CryptoKey"));

        if (! keys.encryptionKey instanceof CryptoKey)
          return done(new Error("The encryption key should be an instance of CryptoKey"));

        if (! keys.signingKey instanceof CryptoKey)
          return done(new Error("The signing key should be an instance of CryptoKey"));

        return done();
      });
    },

    // Tests derivation of encryption key from passphrase and salt.
    testDerive: function(done) {
      var passphrase = 'test';
      var salt = Crypto.generateSalt(16);
      Crypto.deriveKey(passphrase, salt, function(err, key) {
        if (err) return done(err);

        if (! key instanceof CryptoKey)
          return done(new Error("The derived key should be an instance of CryptoKey"));

        return done();
      });
    },

    // Tests encoding and decoding of an array buffer.
    testEncode: function(done) {
      var bytes = new Uint8Array(32);
      window.crypto.getRandomValues(bytes);

      var decoded = Crypto.decodeBase64(bytes);
      var encoded = Crypto.encodeBase64(decoded);
      var redecoded = Crypto.decodeBase64(encoded);
      var reencoded = Crypto.encodeBase64(decoded);

      if (! _.isEqual(encoded, bytes))
        return done(new Error("The encoded array should match the original array"));

      if (! _.isEqual(reencoded, bytes))
        return done(new Error("The re-encoded array should match the original array"));

      if (! _.isEqual(redecoded, decoded))
        return done(new Error("The re-decoded string should match the decoded string"));

      return done();
    },

    // Tests encryption of plaintext with passphrase.
    testEncrypt: function(done) {
      var passphrase = 'test';
      var salt = Crypto.generateSalt(16);
      var plaintext = 'Hello!';

      Crypto.deriveKeys(passphrase, salt, function(err, keys) {
        if (err) return done(err);
        var key = keys.encryptionKey;

        Crypto.encrypt(key, plaintext, function(err, result) {
          if (err) return done(err);
          var ciphertext = result.ciphertext;

          if (!ciphertext)
            return done(new Error("The ciphertext should be returned."));

          if (ciphertext == plaintext)
            return done(new Error("The ciphertext should be encrypted."));

          return done();
        });
      });
    },

    // Tests decryption of ciphertext with passphrase.
    testDecrypt: function(done) {
      var passphrase = 'test';
      var salt = Crypto.generateSalt(16);
      var plaintext = 'Hello!';
      Crypto.deriveKey(passphrase, salt, function(er1, key) {
        Crypto.encrypt(key, plaintext, function(er2, result) {
          Crypto.decrypt(key, result.ciphertext, result.algorithm, function(er3, decrypted) {
            if (er1 || er2 || er3) return done(er1 || er2 || er3);

            if (!decrypted)
              return done(new Error("The decrypted text should be returned."));

            if (decrypted == result.ciphertext)
              return done(new Error("The ciphertext should be encrypted."));

            if (decrypted != plaintext)
              return done(new Error("The decrypted text should match the plaintext."));

            return done();
          });
        });
      });
    },

    // Tests signing and verification of message with key.
    testSignAndVerify: function(done) {
      var passphrase = 'test';
      var salt = Crypto.generateSalt(16);
      var plaintext = 'Hello!';

      Crypto.deriveKeys(passphrase, salt, function(err, keys) {
        if (err) return done(err);
        var encryptionKey = keys.encryptionKey;
        var signingKey = keys.signingKey;

        Crypto.encrypt(encryptionKey, plaintext, function(err, result) {
          if (err) return done(err);
          var ciphertext = result.ciphertext;

          Crypto.sign(signingKey, ciphertext, function(err, signature) {
            if (err) return done(err);

            Crypto.verify(signingKey, ciphertext, signature, function(err, isValid) {
              if (err) return done(err);

              if (! isValid)
                return done(new Error("Valid signature should validate successfully"));

              return done();
            });
          });
        });
      });
    },

    // Tests export of encryption key.
    testExport: function(done) {
      var passphrase = 'test';
      var salt = new Uint8Array([
        0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7,
        0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf
      ]);
      Crypto.deriveKey(passphrase, salt, function(er1, key) {
        Crypto.exportKey(key, function(er2, exportedKey) {
          if (er1 || er2) return done(er1 || er2);

          var array = Crypto.encodeBase58(exportedKey)
          var hex = Crypto.decodeHex(array);
          var base64 = Crypto.decodeBase64(array);
          var base58 = exportedKey;

          if (!exportedKey)
            return done(new Error("Exported key should be returned."))

          if (hex != "c5ff9a5225128895e4e80ed12cbbe2559e3e2e3a7963ac4a6116936f95e01e0f")
            return done(new Error("Exported key should match expected hex value"));

          if (base64 != "xf+aUiUSiJXk6A7RLLviVZ4+Ljp5Y6xKYRaTb5XgHg8=")
            return done(new Error("Exported key should match expected Base64 value"));

          if (base58 != "EKuNdPMzr5bVZkjNHgopNZkXfQjf9bZg1KT5rt1y1Ykv")
            return done(new Error("Exported key should match expected Base58 value"));

          return done();
        });
      });
    },

    // Tests encryption methods.
    testEncryption: function(callback) {
      var tests = [
        [Crypto.testSalt, "Should generate salt with given length in bytes"],
        [Crypto.testDeriveKeys, "Should derive keys from passphrase and salt"],
        [Crypto.testDerive, "Should derive encryption key from passphrase and salt"],
        [Crypto.testEncode, "Should encode and decode an array buffer"],
        [Crypto.testEncrypt, "Should encrypt plaintext with key"],
        [Crypto.testDecrypt, "Should decrypt ciphertext with key"],
        [Crypto.testSignAndVerify, "Should sign and verify an encrypted message"],
        [Crypto.testExport, "Should export the key as a Base58 string"]
      ];
      var module = [tests, "Crypto Encryption Tests"];
      Uta.Test.runAsyncModule(module, callback);
    },

    // Test this module.
    test: function(callback) {
      Crypto.testEncryption(callback);
    }
  };

  return Crypto;
});
