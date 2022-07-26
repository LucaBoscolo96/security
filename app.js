const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
require('dotenv').config()
const { log } = require("console");
const mongoose = require("mongoose");
const app = express();
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy= require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/userDB");
const encrypt = require("mongoose-encryption");
const passportLocalMongoose = require("passport-local-mongoose");

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done){
    done(null, user.id)
})
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user)
    })
})

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app
  .route("/")

  .get(function (req, res) {
    res.render("home");
  });

app.get("/secrets", function (req, res) {
  User.find({'secret':{$ne: null}}, function(err, foundUsers){
    if(!err){
        if(foundUsers){
            res.render('secrets', {usersWithSecrets: foundUsers})
        }
    }
  })
});

app
  .route("/login")

  .get(function (req, res) {
    res.render("login");
  })
  .post(function (req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    req.login(user, function (err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    });
  });

app
  .route("/register")

  .get(function (req, res) {
    res.render("register");
  })
  .post(function (req, res) {
    User.register(
      { username: req.body.username },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("secrets");
          });
        }
      }
    );
  });

app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.get('/auth/google', 
    passport.authenticate('google', { scope:['profile']})
)
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
  
app.route('/submit')

.get(function(req, res){
    if (req.isAuthenticated()) {
        res.render("submit");
      } else {
        res.redirect("/login");
      }
})
.post(function(req,res){
    const submittedSecret= req.body.secret
    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret=submittedSecret;
                foundUser.save(function(){
                    res.redirect('secrets')
                })
            }
        }
    })
})

app.listen(3000, function () {
  console.log("server started on port 3000");
});
