/* jslint node: true */
'use strict';

var async = require('async');
var _ = require('lodash');
var math = require('mathjs');
var assert = require('assert');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//
// ## Schema definitions
// Define our schemas for our questions(words, answers and
// our little neural network
//
var hiddenNodesSchema = new Schema({
  creation_key: {type: String, index: true}
});

var wordSchema = new Schema({
  date: {type: Date, default: Date()},
  text: String
});

var answerSchema = new Schema({
  date: {type: Date, default: Date()},
  text: String
});

var wordStrengthSchema = new Schema({
  from: Schema.ObjectId,
  to: Schema.ObjectId,
  strength: Number
});

var answerStrengthSchema = new Schema({
  from: Schema.ObjectId,
  to: Schema.ObjectId,
  strength: Number
});

hiddenNodesSchema.statics.generateNode = function (options, realCallback) {
  assert(options.words, 'We need an array of words from the question');
  assert(options.answers, 'We need an array of answers');
  assert(options.WordStrength, 'WordStrength needs to be a model object');
  assert(options.AnswerStrength, 'AnswerStrength needs to be a model object');

  var self = this;
  var words = options.words;
  var answers = options.answers;
  var WordStrength = options.WordStrength;
  var AnswerStrength = options.AnswerStrength;
  var key = words.sort().join(':'); // The hidden node identifier

  async.waterfall([
    function (callback) {
      self.findOne({creation_key: key}, callback);
    },
    function (doc, callback) {
      if (doc) {
        return callback(null, doc);
      }

      self.create({creation_key: key}, callback);
    },
    function (doc, callback) {
      async.each(words, function (word, eachCallback) {
        var strength = math.round(1.0 / words.length, 7);
        WordStrength.setStrength(word, doc._id, strength, eachCallback);
      }, function (error) {
        callback(error, doc);
      });
    },
    function (doc, callback) {
      async.each(answers, function (word, eachCallback) {
        AnswerStrength.setStrength(word, doc._id, 0.1, eachCallback);
      }, function (error) {
        callback(error, doc);
      });
    }
  ], function (err, result) {
    realCallback(err, result);
  });
};

hiddenNodesSchema.statics.getAll = function (options, realCallback) {
  assert(options.words, 'We need an array of words from the question');
  assert(options.answers, 'We need an array of answers');
  assert(options.WordStrength, 'WordStrength needs to be a model object');
  assert(options.AnswerStrength, 'AnswerStrength needs to be a model object');

  var words = options.words;
  var answers = options.answers;
  var WordStrength = options.WordStrength;
  var AnswerStrength = options.AnswerStrength;

  async.parallel([
    function (callback) {
      var query = {from: {'$in': words}};
      var result = WordStrength.find(query);
      result.select('to');
      result.exec(callback);
    },
    function (callback) {
      var query = {from: {'$in': answers}};
      var result = AnswerStrength.find(query);
      result.select('to');
      result.exec(callback);
    },
  ], function (err, result) {
    result = _.flatten(result, true);
    result = _.pluck(result, 'to');
    realCallback(err, result);
  });
};

wordSchema.statics.add = function (word, callback) {
  var self = this;

  this.findOne({text: word}, function (error, doc) {
    if (error) {
      return callback(error, null);
    }

    if (doc) {
      return callback(null, doc);
    }

    self.create({text: word}, callback);
  });
};

//
// ## getStrength
// Pass it a word id and a hidden node id and you'll get the strength between them
//
// **from** word id
// **to** hidden node id
// **callback**
//
wordStrengthSchema.statics.getStrength = function (from, to, callback) {
  this.findOne({from: from, to: to}, function (error, doc) {
    if (error) {
      return callback(error, null);
    }

    var strength = doc ? doc.strength : -0.2;
    return callback(null, strength);
  });
};

//
// ## setStrength
// Pass it a word id and a hidden node id and you'll set the strength between them
//
// **from** word id
// **to** hidden node id
// **strength** number 1 to -1
// **callback** passed error and document updated or created
//
wordStrengthSchema.statics.setStrength = function (from, to, strength, callback) {
  var self = this;

  this.findOne({from: from, to: to}, function (error, doc) {
    if (error) {
      return callback(error);
    }

    if (doc) {
      doc.strength = strength;
      doc.save(callback);
    } else {
      self.create({
        from: from,
        to: to,
        strength: strength
      }, callback);
    }
  });
};

answerSchema.statics.add = function (answer, callback) {
  var self = this;

  // TODO use something else than the full string to identify an answer
  this.findOne({text: answer}, function (error, doc) {
    if (error) {
      return callback(error, null);
    }

    if (doc) {
      return callback(null, doc);
    }

    self.create({text: answer}, callback);
  });
};

//
// ## getStrength
// Pass it a answer id and a hidden node id and you'll get the strength between them
//
// **from** word id
// **to** hidden node id
// **callback** error, number (strength)
//
answerStrengthSchema.statics.getStrength = function (from, to, callback) {
  this.findOne({from: from, to: to}, function (error, doc) {
    if (error) {
      return callback(error, null);
    }

    var strength = doc ? doc.strength : 0;
    return callback(null, strength);
  });
};

//
// ## setStrength
// Pass it a answer id and a hidden node id and you'll set the strength between them
//
// **from** word id
// **to** hidden node id
// **strength** number 1 to -1
// **callback** passed error and document updated or created
//
answerStrengthSchema.statics.setStrength = function (from, to, strength, callback) {
  var self = this;

  this.findOne({from: from, to: to}, function (error, doc) {
    if (error) {
      return callback(error);
    }

    if (doc) {
      doc.strength = strength;
      doc.save(callback);
    } else {
      self.create({
        from: from,
        to: to,
        strength: strength
      }, callback);
    }
  });
};

module.exports.HiddenNodes = mongoose.model('HiddenNodes', hiddenNodesSchema);
module.exports.Word = mongoose.model('Word', wordSchema);
module.exports.Answer = mongoose.model('Answer', answerSchema);
module.exports.WordStrength = mongoose.model('WordStrength', wordStrengthSchema);
module.exports.AnswerStrength = mongoose.model('AnswerStrength', answerStrengthSchema);
