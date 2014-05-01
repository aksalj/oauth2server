######OAuth 2.0 Server
- `GET` from `/authorize` to get for an `authorization code` or `access token` after a user allows it. The following parameters are expected:

	- `response_type`: Type of response to send to callback. This can be `code` for an authorization code or `token` for an access token.
	- `client_id`: Registered client ID.
	- `redirect_uri`: Callback that handles the response (`code` or `token`).


- `POST` from `/authorize/decision` to process user's decision to authorize a client or not. See `view/dialog.jade`


- `POST` from `/token` to exchange an `authorization code`, a `username` + `password` or `client id` + `client secret` for an `access token`.