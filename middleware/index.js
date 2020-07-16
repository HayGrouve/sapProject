var User = require('../models/user');
var middlewareObj = {};

middlewareObj.isAdmin = function (req, res, next) {
  if (req.isAuthenticated()) {
    User.findById(req.user.id, (err, foundUser) => {
      if (err || !foundUser) {
        req.flash('error', 'User not found!');
        res.redirect('/application');
      } else {
        if (req.user.isAdmin) {
          next();
        } else {
          req.flash('error', 'You are not administrator!');
          res.redirect('/application');
        }
      }
    });
  } else {
    req.flash('success', 'Please login first!');
    res.redirect('back');
  }
};
middlewareObj.isEmployee = function (req, res, next) {
  if (req.isAuthenticated()) {
    User.findById(req.user.id, (err, foundUser) => {
      if (err || !foundUser) {
        req.flash('error', 'User not found!');
        res.redirect('/application');
      } else {
        if (req.user.isEmployee) {
          next();
        } else {
          req.flash('error', 'You are not employee!');
          res.redirect('/application');
        }
      }
    });
  } else {
    req.flash('success', 'Please login first!');
    res.redirect('back');
  }
};

middlewareObj.checkUsername = function (req, res, next) {
  if (req.body.username.indexOf('@') !== -1) {
    User.findOne({ email: req.body.username }, (err, foundUser) => {
      if (err || !foundUser) {
        req.flash('error', 'Please check your username or password');
        return res.redirect('back');
      } else {
        req.body.username = foundUser.username;
        next();
      }
    });
  } else {
    next();
  }
};

middlewareObj.isLoggedIn = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please Login First !');
  res.redirect('/login');
};

module.exports = middlewareObj;
