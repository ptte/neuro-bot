/* jslint node: true */
'use strict';

//
// ## Neural network class
//

var async = require('async');
var _ = require('lodash');
var math = require('mathjs');
var assert = require('assert');

//
// ## Network object
// This object will instantiate a network for us to play with.
// Call #setup
//
// **options** object
//
// Options:
// **words** required, array with word ids
// **answers** required, array of answer ids
// **WordStrength** required, mongoose model
// **AnswerStrength** required, mongoose model
// **HiddenNodes** required, mongoose model
//
var Network = module.exports = function Network(options) {
  assert(options.words, 'We need an array of words from the question');
  assert(options.answers, 'We need an array of answers');
  assert(options.WordStrength, 'WordStrength needs to be a model object');
  assert(options.AnswerStrength, 'AnswerStrength needs to be a model object');
  assert(options.HiddenNodes, 'HiddenNodes needs to be a model object');

  this.words = options.words;
  this.answers = options.answers;
  this.HiddenNodes = options.HiddenNodes;
  this.WordStrength = options.WordStrength;
  this.AnswerStrength = options.AnswerStrength;
  // Keep all the hidden nodes
  this.hidden = null;
  // Keep our input/hidden/output weights
  this.ai = null;
  this.ah = null;
  this.ao = null;
  // Keep our weights
  this.wi = null;
  this.wo = null;
};

//
// ## Setup our network
// Will load all hidden nodes, and fetch the weights for all connections
// so we have them in memory to play around with.
//
// Whatever we want to do with the network, we should probably run setup first
//
// **callback** function (error) called when all the data is fetched
//
Network.prototype.setup = function (callback) {
  async.waterfall([
    this.getHiddenNodes.bind(this),
    this.setHiddenNodes.bind(this),
    this.buildDefWeights.bind(this),
    this.getWordWeights.bind(this),
    this.setWordWeights.bind(this),
    this.getAnswerWeights.bind(this),
    this.setAnswerWeights.bind(this)
  ], callback);
};

//
// ## Feed forward
// aka get our results. This will run through the network and calculate the
// the score for our answers
//
Network.prototype.feedForward = function () {
  assert(this.wi, 'Did you run setup first?');
  assert(this.wo, 'Are you sure you ran setup?');

  var sum = 0;
  var i = 0;
  var j = 0;
  var k = 0;

  // Hidden activations
  for (i = 0; i < this.hidden.length; i++) {
    sum = 0;
    for (j = 0; j < this.words.length; j++) {
      sum += this.ai[j] * this.wi[j][i];
    }
    this.ah[i] = math.tanh(sum);
  }

  for (k = 0; k < this.answers.length; k++) {
    console.log(k);
    sum = 0;
    for (i = 0; i < this.hidden.length; i++) {
      sum += this.ah[i] * this.wo[i][k];
    }
    this.ao[k] = math.tanh(sum);
  }

  return this.ao;
};

//////// Internal functions ////////

// Get relevant hidden nodes
Network.prototype.getHiddenNodes = function (cb) {
  // Get hidden nodes
  var options = {
    words: this.words,
    answers: this.answers,
    WordStrength: this.WordStrength,
    AnswerStrength: this.AnswerStrength,
  };

  this.HiddenNodes.getAll(options, cb);
};

// Save our hidden layer in memory for later
Network.prototype.setHiddenNodes = function (result, cb) {
  this.hidden = result;
  cb(null);
};

// Build arrays containing a default strength of 1.0 for each node
// This looks a bit weird, I know.
Network.prototype.buildDefWeights = function (cb) {
  this.ai = Array.apply(null, {length: this.words.length}).map(function () { return 1; });
  this.ah = Array.apply(null, {length: this.hidden.length}).map(function () { return 1; });
  this.ao = Array.apply(null, {length: this.answers.length}).map(function () { return 1; });
  cb(null);
};

// Get all the weights and connections between words and hidden layer
Network.prototype.getWordWeights = function (cb) {
  // Fetch weights for words to hidden layer
  var self = this;
  async.mapSeries(this.words, function (word, cbOuterLoop) {
    async.mapSeries(self.hidden, function (node, cbInnerLoop) {
      self.WordStrength.getStrength(word, node, cbInnerLoop);
    }, cbOuterLoop);
  }, cb);
};

// Save the connections
Network.prototype.setWordWeights = function (result, cb) {
  console.log(result);
  this.wi = result; // this should be a matrix of words-hidden weights
  cb(null);
};

// Fetch weigths for answers to hidden layer
Network.prototype.getAnswerWeights = function (cb) {
  var self = this;
  async.mapSeries(this.hidden, function (node, cbOuterLoop) {
    async.mapSeries(self.answers, function (answer, cbInnerLoop) {
      self.AnswerStrength.getStrength(answer, node, cbInnerLoop);
    }, cbOuterLoop);
  }, cb);
};

// Save the answer connections
Network.prototype.setAnswerWeights = function (result, cb) {
  console.log(result);
  this.wo = result;
  cb(null);
};
