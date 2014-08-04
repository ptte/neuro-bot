/* jslint node: true */
'use strict';

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/bot');

var Model = require('./lib/model.js');
var Network = require('./lib/network.js');

var options = {
  words: ['53dd779159cb1dec3fbfbd0f', '53de790c546947c441ad78c6'],
  answers: ['53de858f22c4e6d442a925c2', '53de858f22c4e6d442a925c4', '53de858f22c4e6d442a925c3'],
  WordStrength: Model.WordStrength,
  AnswerStrength: Model.AnswerStrength,
  HiddenNodes: Model.HiddenNodes,
};

var MyNetwork = new Network(options);
MyNetwork.setup(function (error) {
  var result = MyNetwork.feedForward();
  console.log(error, result);
});
