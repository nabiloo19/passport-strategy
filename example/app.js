const express = require("express"),
  session = require("express-session"),
  passport = require("passport"),
  SallaAPIFactory = require("@salla.sa/passport-strategy"),
  consolidate = require("consolidate");

require("dotenv").config();

/*
  Create a .env file in the root directory of your project. 
  Add environment-specific variables on new lines in the form of NAME=VALUE. For example:
  CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ...
*/
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const port = 8081;

//   Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session. Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing. However, since this example does not
//   have a database of user records, the complete salla user is serialized
//   and deserialized.

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

// we initialize our Salla API
const SallaAPI = new SallaAPIFactory({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: "http://localhost:8081/oauth/callback",
});

//   Use the Salla Strategy within Passport.
passport.use(SallaAPI.getPassportStrategy());

var app = express();

// configure Express
app.set("views", __dirname + "/views");
app.set("view engine", "html");

// set the session secret
// you can store session data in any database (monogdb - mysql - inmemory - etc) for more (https://www.npmjs.com/package/express-session)
app.use(
  session({ secret: "keyboard cat", resave: true, saveUninitialized: true })
);

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

// serve static files from public folder
app.use(express.static(__dirname + "/public"));

// set the render engine to nunjucks

app.engine("html", consolidate.nunjucks);

// GET /oauth/redirect
//   Use passport.authenticate() as route middleware to authenticate the
//   request. The first step in salla authentication will involve redirecting
//   the user to accounts.salla.sa. After authorization, salla will redirect the user
//   back to this application at /oauth/callback
app.get("/oauth/redirect", passport.authenticate("salla"));

// GET /oauth/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get(
  "/oauth/callback",
  passport.authenticate("salla", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/");
  }
);

// GET /
// render the index page

app.get("/", function (req, res) {
  res.render("index.html", { user: req.user, isLogin: req.user });
});

// GET /account
// get account information and ensure user is authenticated

app.get("/account", ensureAuthenticated, function (req, res) {
  res.render("account.html", {
    user: req.user,
    isLogin: req.user,
  });
});

// GET /refreshToken
// get new access token

app.get("/refreshToken", ensureAuthenticated, function (req, res) {
  SallaAPI.requestNewAccessToken(SallaAPI.getRefreshToken())
    .then((token) => {
      res.render("token.html", {
        token,
        isLogin: req.user,
      });
    })
    .catch((err) => res.send(err));
});

// GET /orders
// get all orders from user store

app.get("/orders", ensureAuthenticated, async function (req, res) {
  res.render("orders.html", {
    orders: await SallaAPI.getAllOrders(),
    isLogin: req.user,
  });
});

// GET /customers
// get all customers from user store

app.get("/customers", ensureAuthenticated, async function (req, res) {
  res.render("customers.html", {
    customers: await SallaAPI.getAllCustomers(),
    isLogin: req.user,
  });
});


// GET /logout
//   logout from passport
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.listen(port, function () {
  console.log("App is listening on port " + port);
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}
