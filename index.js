/**
 *  Copyright (c) 2014 Salama AB
 *  All rights reserved
 *  Contact: aksalj@aksalj.me
 *  Website: http://www.aksalj.me
 *
 *  Project : oauth2server
 *  File : index.js
 *  Date : 3/22/14 1:35 PM
 *  Description : Simple OAuth 2.0 Server (using oauth2orize and mongodb)
 *               https://github.com/jaredhanson/oauth2orize/blob/master/examples/all-grants/oauth2.js
 *               http://aaronparecki.com/articles/2012/07/29/1/oauth2-simplified
 *
 */
var oauth2orize = require('oauth2orize');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var login = require('connect-ensure-login');
var db = require('./db');

var dialogView = "oauth/dialog";
var loginURI = "/";

{
    /**
     * BasicStrategy & ClientPasswordStrategy
     *
     * These strategies are used to authenticate registered OAuth clients.  They are
     * employed to protect the `token` endpoint, which consumers use to obtain
     * access tokens.  The OAuth 2.0 specification suggests that clients use the
     * HTTP Basic scheme to authenticate.  Use of the client password strategy
     * allows clients to send the same credentials in the request body (as opposed
     * to the `Authorization` header).  While this approach is not recommended by
     * the specification, in practice it is quite common.
     */
    passport.use(new BasicStrategy(
        function (username, password, done) {
            db.clients.findByClientId(username, function (err, client) {
                if (err) {
                    return done(err);
                }
                if (!client) {
                    return done(null, false);
                }
                if (client.clientSecret != password) {
                    return done(null, false);
                }
                return done(null, client);
            });
        }
    ));

    passport.use(new ClientPasswordStrategy(
        function (clientId, clientSecret, done) {
            db.clients.findByClientId(clientId, function (err, client) {
                if (err) {
                    return done(err);
                }
                if (!client) {
                    return done(null, false);
                }
                if (client.clientSecret != clientSecret) {
                    return done(null, false);
                }
                return done(null, client);
            });
        }
    ));

    /**
     * BearerStrategy
     *
     * This strategy is used to authenticate either users or clients based on an access token
     * (aka a bearer token).  If a user, they must have previously authorized a client
     * application, which is issued an access token to make requests on behalf of
     * the authorizing user.
     */
    passport.use(new BearerStrategy(
        function (accessToken, done) {
            db.accessTokens.find(accessToken, function (err, token) {
                if (err) {
                    return done(err);
                }
                if (!token) {
                    return done(null, false);
                }
                if (token.expires < Date.now()) {
                    return done("Access token has expired", false);
                }

                if (token.userID != null) {
                    db.users.find(token.userID, function (err, user) {
                        if (err) {
                            return done(err);
                        }
                        if (!user) {
                            return done(null, false);
                        }
                        var info = { scope: token.scope, expires: token.expires };
                        done(null, user, info);
                    });
                } else {
                    //The request came from a client only since userID is null
                    //therefore the client is passed back instead of a user
                    db.clients.findByClientId(token.clientID, function (err, client) {
                        if (err) {
                            return done(err);
                        }
                        if (!client) {
                            return done(null, false);
                        }
                        var info = { scope: token.scope, expires: token.expires };
                        done(null, client, info);
                    });
                }
            });
        }
    ));
}


// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated.  To complete the transaction, the
// user must authenticate and approve the authorization request.  Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session.  Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

server.serializeClient(function (client, done) {
    return done(null, client.id);
});

server.deserializeClient(function (id, done) {
    db.clients.find(id, function (err, client) {
        if (err) {
            return done(err);
        }
        return done(null, client);
    });
});

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources.  It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes.  The callback takes the `client` requesting
// authorization, the `redirectURI` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application.  The application issues a code, which is bound to these
// values, and will be exchanged for an access token.

server.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares, done) {
    var code = uid(16);
    db.authorizationCodes.save(code, client.id, redirectURI, user._id, ares.scope, function (err) {
        if (err) {
            return done(err);
        }
        done(null, code);
    });
}));

// Grant implicit authorization.  The callback takes the `client` requesting
// authorization, the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application.  The application issues a token, which is bound to these
// values.

server.grant(oauth2orize.grant.token(function (client, user, ares, done) {
    var token = uid(256);
    db.accessTokens.save(token, user._id, client.clientId, ares.scope, function (err) {
        if (err) {
            return done(err);
        }
        done(null, token);
    });
}));

// Exchange authorization codes for access tokens.  The callback accepts the
// `client`, which is exchanging `code` and any `redirectURI` from the
// authorization request for verification.  If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code.

server.exchange(oauth2orize.exchange.code(function (client, code, redirectURI, done) {
    db.authorizationCodes.find(code, function (err, authCode) {
        if (err) {
            return done(err);
        }
        if (!authCode) {
            return done(null, false);
        }

        if (client.id !== authCode.clientID) {
            return done(null, false);
        }
        if (redirectURI !== authCode.redirectURI) {
            return done(null, false);
        }
        //FIXME: Needs testing
        if (authCode.expires < Date.now()) {
            return done("Authorization code has expired", false);
        }

        var token = uid(256)
        db.accessTokens.save(token, authCode.userID, authCode.clientID, authCode.scope, function (err) {
            if (err) {
                return done(err);
            }
            db.authorizationCodes.delete(code, function (err) {
                done(err, token);
            });
        });
    });
}));

// Exchange user id and password for access tokens.  The callback accepts the
// `client`, which is exchanging the user's name and password from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the user who authorized the code.

server.exchange(oauth2orize.exchange.password(function (client, username, password, scope, done) {

    //Validate the client
    db.clients.findByClientId(client.clientId, function (err, localClient) {
        if (err) {
            return done(err);
        }
        if (localClient === null) {
            return done(null, false);
        }
        if (localClient.clientSecret !== client.clientSecret) {
            return done(null, false);
        }
        //Validate the user
        db.users.findByUsername(username, function (err, user) {
            if (err) {
                return done(err);
            }
            if (user === null) {
                return done(null, false);
            }

            user.checkPassword(password, function (err, valid) {
                if (valid) {
                    //Everything validated, return the token
                    var token = uid(256);
                    db.accessTokens.save(token, user._id, client.clientId, scope, function (err) {
                        if (err) {
                            return done(err);
                        }
                        done(null, token);
                    });
                } else {
                    done(err, false);
                }
            });
        });
    });
}));

// Exchange the client id and password/secret for an access token.  The callback accepts the
// `client`, which is exchanging the client's id and password/secret from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the client who authorized the code.

server.exchange(oauth2orize.exchange.clientCredentials(function (client, scope, done) {

    //Validate the client
    db.clients.findByClientId(client.clientId, function (err, localClient) {
        if (err) {
            return done(err);
        }
        if (localClient === null) {
            return done(null, false);
        }
        if (localClient.clientSecret !== client.clientSecret) {
            return done(null, false);
        }
        var token = uid(256);
        //Pass in a null for user id since there is no user with this grant type
        db.accessTokens.save(token, null, client.clientId, scope, function (err) {
            if (err) {
                return done(err);
            }
            done(null, token);
        });
    });
}));


function setupEndPoints() {

    // user authorization endpoint
    //
    // `authorization` middleware accepts a `validate` callback which is
    // responsible for validating the client making the authorization request.  In
    // doing so, is recommended that the `redirectURI` be checked against a
    // registered value, although security requirements may vary across
    // implementations.  Once validated, the `done` callback must be invoked with
    // a `client` instance, as well as the `redirectURI` to which the user will be
    // redirected after an authorization decision is obtained.
    //
    // This middleware simply initializes a new authorization transaction.  It is
    // the application's responsibility to authenticate the user and render a dialog
    // to obtain their approval (displaying details about the client requesting
    // authorization).  We accomplish that here by routing through `ensureLoggedIn()`
    // first, and rendering the `dialog` view.

    //TODO: Make sure `expire` is returned to callback in addition to token/code and/or type
    exports.authorization = [
        login.ensureLoggedIn(loginURI),
        server.authorization(function (clientID, redirectURI, done) {
            db.clients.findByClientId(clientID, function (err, client) {
                if (err) {
                    return done(err);
                }
                if (client && client.clientCallback !== redirectURI) {
                    return done("Unregistered redirect URI", null, redirectURI);
                }
                return done(null, client, redirectURI);
            });
        }),
        function (req, res) {
            res.render(dialogView, { transactionID: req.oauth2.transactionID, user: req.user, client: req.oauth2.client });
        }
    ];

    // user decision endpoint
    //
    // `decision` middleware processes a user's decision to allow or deny access
    // requested by a client application.  Based on the grant type requested by the
    // client, the above grant middleware configured above will be invoked to send
    // a response.

    exports.decision = [
        login.ensureLoggedIn(loginURI),
        server.decision(null, function (req, done) {
            if (req.body.scope) {
                done(null, {scope: req.body.scope});
            } else {
                done("No Scope Specified!", null);
            }
        })
    ];


    // token endpoint
    //
    // `token` middleware handles client requests to exchange authorization grants
    // for access tokens.  Based on the grant type being exchanged, the above
    // exchange middleware will be invoked to handle the request.  Clients must
    // authenticate when making requests to this endpoint.
    //TODO: Test refresh tokens
    exports.token = [
        passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
        server.token(),
        server.errorHandler()
    ];

};

function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
/**
 * Return a unique identifier with the given `len`.
 *     uid(10); //"FDaS435D2z"
 */
function uid(len) {
    var buf = []
        , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        , charlen = chars.length;

    for (var i = 0; i < len; ++i) {
        buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
};


/**
 *
 * Setup server params;
 *
 * @param userModel Mongoose user model. Required!
 * @param approvalView Approval to rendered. Required for authorization page.
 * @param loginURL Login redirect when not authenticated. Required for authorization page.
 */
exports.initialize = function (userModel, approvalView, loginURL) {
    db.users.setModel(userModel);
    dialogView = approvalView || dialogView;
    loginURI = loginURL || loginURI;

    setupEndPoints();
};
