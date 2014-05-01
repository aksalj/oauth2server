/**
 *  Copyright (c) 2014 Salama AB
 *  All rights reserved
 *  Contact: aksalj@aksalj.me
 *  Website: http://www.aksalj.me
 *
 *  Project : Ngoma
 *  File : tokens.js
 *  Date : 3/22/14 1:35 PM
 *  Description : Access tokens
 *
 */
var mongoose = require('mongoose');

var Token = mongoose.model('Token',
    mongoose.Schema({
        tokenKey: String,
        userID: String,
        clientID: String,
        redirectURI: String,
        scope: [String],
        expires: Number
    })
);

exports.Token = Token;

exports.find = function (key, done) {
    Token.findOne({tokenKey: key}, function (err, token) {
        if (err) {
            done(err, null);
        } else {
            done(null, token);
        }
    });
};

exports.save = function (token, userID, clientID, scope, done) {
    var tok = {
        tokenKey: token,
        userID: userID,
        clientID: clientID,
        redirectURI: null,
        scope: scope,
        expires: Date.now() + 2592000000 // 30 days from now
    };
    token = new Token(tok);
    token.save(function (err, tok) {
        if (err) {
            done(err, null);
        } else {
            done(null, tok);
        }
    });
};

exports.delete = function (key, done) {
    Token.remove({tokenKey: key}, function (err) {
        if (err) {
            done(err);
        } else {
            done(null);
        }
    });
};