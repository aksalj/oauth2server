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
var path = require('path');
var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');
var oauth = require('./../index');

var User = mongoose.model('User', new mongoose.Schema({
    name: String,
    username: String,
    password: String
}));

oauth.initialize(User, "dialog", "/login");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'view'));
app.set('view engine', 'jade');

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'static')));


app.get('/authorize', oauth.authorization);         // Init client authorization
app.post('/authorize/decision', oauth.decision);    // Process user's decision
app.post('/token', oauth.token);                    // Issue client an access token in exchange for an auth code, client/pwd or user/pwd?

app.get('/login', function (req, res, next) {
    res.render('login',{})
});

app.post('/login', function (req, res, next) {
    // Check username and password
});

app.get('/protected', passport.authenticate('bearer', { session: false }), function (req, res, next) {
    res.send("Hello from protected resource!");
});



app.listen(3000);