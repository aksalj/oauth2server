/**
 *  Copyright (c) 2014 Salama AB
 *  All rights reserved
 *  Contact: aksalj@aksalj.me
 *  Website: http://www.aksalj.me
 *
 *  Project : oauth2server
 *  File : codes.js
 *  Date : 3/22/14 1:35 PM
 *  Description : Authorization codes
 *
 */
var tokens = require('./tokens');

exports.find = tokens.find;
exports.delete = tokens.delete;

exports.save = function (code, clientID, redirectURI, userID, scope, done) {
    var tok = {
        tokenKey: code,
        userID: userID,
        clientID: clientID,
        redirectURI: redirectURI,
        scope: scope,
        expires: Date.now() + 120000 // 2 minutes from now
    };
    var token = new tokens.Token(tok);
    token.save(function (err, tok) {
        if (err) {
            done(err, null);
        } else {
            done(null, tok);
        }
    });
};
