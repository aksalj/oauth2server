/**
 *  Copyright (c) 2014 Salama AB
 *  All rights reserved
 *  Contact: aksalj@aksalj.me
 *  Website: http://www.aksalj.me
 *
 *  Project : oauth2server
 *  File : users.js
 *  Date : 3/28/14 5:02 PM
 *  Description :
 *
 */
var user = null;

exports.setModel = function (model) {
    user = model;
};

exports.find = function (id, done) {
    user.findOne({_id: id}, function (err, user) {
        if (err) {
            done(null, null);
        } else {
            done(null, user);
        }
    });
};

exports.findByUsername = function (username, done) {
    user.findOne({username: username}, function (err, user) {
        if (err) {
            done(null, null);
        } else {
            done(null, user);
        }
    });
};