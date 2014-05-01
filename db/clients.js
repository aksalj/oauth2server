/**
 *  Copyright (c) 2014 Salama AB
 *  All rights reserved
 *  Contact: aksalj@aksalj.me
 *  Website: http://www.aksalj.me
 *
 *  Project : Ngoma
 *  File : clients.js
 *  Date : 3/22/14 1:35 PM
 *  Description : client.js
 *
 */
var mongoose = require('mongoose');

var Client = mongoose.model('Client',
        mongoose.Schema({
            name: String,
            description: String,
            author: String,
            email: String,
            website: String,
            clientId: String,
            clientSecret: String,
            clientCallback: String,
            clientScope: [{name: String, description: String, required: Boolean}]
        })
    );

var findClientById = function (id, callback) {
    Client.findOne({_id: id}, callback);
};

var findClientByClientId = function (clientId, callback) {
    Client.findOne({clientId: clientId}, callback);
};

var removeClient = function (id, callback) {
    Client.remove({_id: id}, callback);
};

exports.create = function (client, callback) {
    client = new Client(client);
    client.save(callback);
};

exports.find = function (id, done) {
    findClientById (id, function (err, client) {
        if (err) {
            done(err, null);
        }else {
            done(null, client);
        }
    });
};

exports.findByClientId = function (clientId, done) {
    findClientByClientId(clientId, function (err, user) {
        if (err) {
            done(err, null);
        } else {
            done(null, user);
        }
    });
};
