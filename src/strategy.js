/**
 * Module dependencies.
 */
var util = require("util"),
  querystring = require("querystring"),
  OAuth2Strategy = require("passport-oauth").OAuth2Strategy;

const { generateRandomeString } = require("./helpers/generate-random-string");
const {InternalOAuthError} = require('passport-oauth');
/**
 * `Strategy` constructor.
 *
 * The Salla authentication strategy authenticates requests by delegating to
 * Salla using the OAuth 2.0 protocol.
 *
 * Applications must supply a `verify` callback which accepts an `accessToken`,
 * `refreshToken` and service-specific `profile`, and then calls the `done`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occured, `err` should be set.
 *
 * Options:
 *   - `clientID`      your Salla application's app key
 *   - `clientSecret`  your Salla application's app secret
 *   - `callbackURL`   URL to which Salla will redirect the user
 *                     after granting authorization
 *
 * Examples:
 *
 *     passport.use(new Strategy({
 *         clientID: 'app key',
 *         clientSecret: 'app secret'
 *         callbackURL: 'https://www.example.net/auth/salla/callback'
 *       },
 *       function(accessToken, refreshToken, profile, done) {
 *         User.findOrCreate(..., function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
  options = options || {};
  options.authorizationURL =
    options.authorizationURL || "https://accounts.salla.sa/oauth2/auth";
  options.tokenURL =
    options.tokenURL || "https://accounts.salla.sa/oauth2/token";

  this._userProfileURL =
    options.userProfileURL || "https://accounts.salla.sa/oauth2/user/info";
  options.scopeSeparator = options.scopeSeparator || " ";
  options.state = generateRandomeString(16);
  OAuth2Strategy.call(this, options, verify);
  this.name = "salla";

  this._oauth2.getOAuthAccessToken = function (code, params, callback) {
    params = params || {};
    var codeParam =
      params.grant_type === "refresh_token" ? "refresh_token" : "code";
    params[codeParam] = code;
    params["client_id"] = this._clientId;
    params["client_secret"] = this._clientSecret;

    var post_data = querystring.stringify(params);
    var post_headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    this._request(
      "POST",
      this._getAccessTokenUrl(),
      post_headers,
      post_data,
      null,
      function (error, data, response) {
        if (error) callback(error);
        else {
          var results = JSON.parse(data);

          var access_token = results.access_token;
          var refresh_token = results.refresh_token;
          var expires_in = results.expires_in;
          delete results.refresh_token;

          callback(null, access_token, refresh_token, expires_in, results); // callback results =-=
        }
      }
    );
  };
}

/**
 * Inherit from `OAuth2Strategy`.
 */
util.inherits(Strategy, OAuth2Strategy);

/**
 * Retrieve user profile from Salla.
 *
 *
 * @param {String} accessToken
 * @param {Function} done
 * @api protected
 */
Strategy.prototype.userProfile = function (accessToken, done) {
  var authorization = "Bearer " + accessToken;
  var headers = {
    Authorization: authorization,
  };
  this._oauth2._request(
    "GET",
    this._userProfileURL,
    headers,
    "",
    "",
    function (err, body, res) {
      if (err) {
        return done(
          new InternalOAuthError("failed to fetch user from Salla ", err)
        );
      }

      try {
        var json = JSON.parse(body);
        done(null, json.data);
      } catch (e) {
        done(e);
      }
    }
  );
};

/**
 * Return extra specific parameters to be included in the authorization
 * request.
 *
 * Options:
 *  - `showDialog` Whether or not to force the user to approve the app again if
 *     they’ve already done so. If false (default), a user who has already
 *     approved the application may be automatically redirected to the URI
 *     specified by redirect_uri. If true, the user will not be automatically
 *     redirected and will have to approve the app again..
 *
 * @param {Object} options
 * @return {Object}
 * @api protected
 */
Strategy.prototype.authorizationParams = function(options) {
  var params = {};

  if (options.showDialog) {
    params.show_dialog = options.showDialog;
  }

  return params;
};

/**
 * Expose `Strategy`.
 */

module.exports = Strategy;
