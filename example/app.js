/**
 *  Copyright (c) 2014 Salama AB
 *  All rights reserved
 *  Contact: aksalj@aksalj.me
 *  Website: http://www.aksalj.me
 *
 *  Project : oauth2server
 *  File : app.js
 *  Date : 5/1/14 2:03 PM
 *  Description :
 *
 */
var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');
var oauth = require(path.join(conf.paths.libraries, "oauth"));

var User = mongoose.model('User', new mongoose.Schema({
    name: String,
    username: String,
    password: String
}));

var app = express();

// view engine setup
app.set('views', path.join(conf.paths.static, 'auth/views'));
app.set('view engine', 'jade');

app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

oauth.initialize(User, "dialog", "/login");

// routing
app.get('/authorize', oauth.authorization);
app.post('/authorize/decision', oauth.decision);
app.post('/token', oauth.token);

app.get('(/login)', function (req, res, next) {

});

app.get('(/protected)', passport.authenticate('bearer', { session: false }), function (req, res, next) {

});



module.exports = app;