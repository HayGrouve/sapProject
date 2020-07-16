const { checkUsername } = require('./middleware/index');

const express = require('express'),
  app = express(),
  bodyParser = require('body-parser'),
  mongoose = require('mongoose'),
  passport = require('passport'),
  flash = require('connect-flash'),
  localStrategy = require('passport-local'),
  async = require('async'),
  nodemailer = require('nodemailer'),
  crypto = require('crypto'),
  User = require('./models/user'),
  Plan = require('./models/plan'),
  UserPlan = require('./models/userPlans'),
  middleware = require('./middleware/index'),
  methodOverride = require('method-override');
require('dotenv').config();

// MONGO CONFIG
mongoose
  .connect(process.env.DATABASEURL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to DB!');
  })
  .catch((err) => {
    console.error('ERROR:', err.message);
  });

//APP CONFIG
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
mongoose.set('useCreateIndex', true);
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));
app.use(flash());

//PASSPORT CONFIG
app.use(
  require('express-session')({
    secret: 'note',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//LOCALS CONFIG
app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

//ROUTES
app.get('/', (req, res) => {
  res.render('index');
});

//REGISTER ROUTES
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  var newUser = new User({
    username: req.body.username,
    firstname: req.body.firstName,
    lastname: req.body.lastName,
    email: req.body.email,
  });
  User.register(newUser, req.body.password, (err, user) => {
    if (err || !user) {
      req.flash('error', 'Username or email already taken!');
      res.redirect('back');
    }
    passport.authenticate('local')(req, res, () => {
      req.flash('success', 'Welcome to RedTell ! ' + user.username);
      res.redirect('/application');
    });
  });
});

// LOGIN LOGOUT ROUTES
app.post('/login', middleware.checkUsername, function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err || !user) {
      req.flash('error', 'Please check your login credentials');
      return res.redirect('back');
    }
    req.logIn(user, function (err) {
      if (err) {
        req.flash('error', 'Login error!');
        res.redirect('back');
      } else {
        // Redirect if it succeeds
        if (req.user.isAdmin) {
          req.flash('success', `Welcome Administrator: ${user.username}!`);
          return res.redirect('/application');
        }
        req.flash('success', `Welcome: ${user.username}!`);
        return res.redirect('/application');
      }
    });
  })(req, res, next);
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// APPLICATION ROUTE
app.get('/application', (req, res) => {
  if (req.query.searchUser) {
    User.find({}, (err, foundUsers) => {
      if (err || !foundUsers) {
        console.error(err);
      } else {
        Plan.find({}, (err, foundPlans) => {
          if (err || !foundPlans) {
            console.error(err);
          } else {
            const regex = new RegExp(escapeRegex(req.query.searchUser), 'gi');
            User.find({ username: regex }, (err, searchUsers) => {
              if (err || searchUsers.length < 1) {
                req.flash(
                  'error',
                  'No users match that query, please try again.'
                );
                res.redirect('/application');
              } else {
                res.render('application', {
                  users: foundUsers,
                  plans: foundPlans,
                  searchUsers: searchUsers,
                  page: 'searchUser',
                });
              }
            });
          }
        });
      }
    });
  } else if (req.query.searchPlan) {
    User.find({}, (err, foundUsers) => {
      if (err || !foundUsers) {
        console.error(err);
      } else {
        Plan.find({}, (err, foundPlans) => {
          if (err || !foundPlans) {
            console.error(err);
          } else {
            const regex = new RegExp(escapeRegex(req.query.searchPlan), 'gi');
            Plan.find({ title: regex }, (err, searchPlans) => {
              if (err || searchPlans.length < 1) {
                req.flash(
                  'error',
                  'No plans match that query, please try again.'
                );
                res.redirect('/application');
              } else {
                res.render('application', {
                  users: foundUsers,
                  plans: foundPlans,
                  searchPlans: searchPlans,
                  page: 'searchPlan',
                });
              }
            });
          }
        });
      }
    });
  } else {
    User.find({}, (err, foundUsers) => {
      if (err || !foundUsers) {
        console.error(err);
      } else {
        Plan.find({}, (err, foundPlans) => {
          if (err || !foundPlans) {
            console.error(err);
          } else {
            if (req.user && req.user != 'undefined') {
              req.user.plans.forEach((plan) => {
                if (!plan.isPaid) {
                  UserPlan.findOne({ _id: plan._id }, (err, foundPlan) => {
                    if (err || !foundPlan) {
                      console.error(err);
                    } else {
                      User.findOne({ _id: req.user._id }, (err, foundUser) => {
                        if (err || !foundUser) {
                          console.error(err);
                        } else {
                          foundUser.plans.pull(foundPlan);
                          foundUser.save((err, data) => {
                            if (err || !foundUser) {
                              console.error(err);
                            } else {
                              UserPlan.findOneAndDelete(
                                { _id: plan._id },
                                (err, deleted) => {
                                  if (err || !foundUser) {
                                    console.error(err);
                                  } else {
                                    res.render('application', {
                                      users: foundUsers,
                                      plans: foundPlans,
                                    });
                                  }
                                }
                              );
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
            res.render('application', { users: foundUsers, plans: foundPlans });
          }
        });
      }
    });
  }
});

//EDIT PROFILE
app.get('/user/:id/edit', middleware.isLoggedIn, (req, res) => {
  User.findById(req.params.id, (err, foundUser) => {
    if (err || !foundUser) {
      req.flash('error', 'User not found!');
      res.redirect('/application');
    } else {
      foundUser.execPopulate('plans', (err, user) => {
        if (err || !user) {
          req.flash('error', `${user.username}'s plans not found!`);
          res.redirect('/application');
        } else {
          Plan.find({}, (err, foundPlans) => {
            if (err || !foundPlans) {
              req.flash('error', 'Plans not found!');
              res.redirect('/application');
            } else {
              User.find({}, (err, foundUsers) => {
                if (err || !foundUsers) {
                  console.error(err);
                } else {
                  res.render('profile', {
                    user: user,
                    plans: foundPlans,
                    users: foundUsers,
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});

//UPDATE PROFILE
app.put('/user/:id', middleware.isLoggedIn, (req, res) => {
  User.findByIdAndUpdate(
    req.params.id,
    req.body.user,
    { useFindAndModify: false },
    (err, updatedUser) => {
      if (err || !updatedUser) {
        req.flash('error', 'User not found!');
        res.redirect('/application');
      } else {
        req.flash('success', 'User Updated!');
        res.redirect('/application');
      }
    }
  );
});

//DELETE PROFILE
app.delete('/user/:id', middleware.isAdmin, (req, res) => {
  User.findByIdAndRemove(
    req.params.id,
    { useFindAndModify: false },
    (err, foundUser) => {
      if (err || !foundUser) {
        console.error(err);
        req.flash('error', 'User not found!');
        res.redirect('back');
      } else {
        req.flash('success', 'User Deleted!');
        res.redirect('/application');
      }
    }
  );
});

//CREATE PLAN
app.get('/plan/new', middleware.isEmployee, (req, res) => {
  Plan.find({}, (err, foundPlans) => {
    if (err || !foundPlans) {
      req.flash('error', 'Plans not found!');
      res.redirect('/application');
    } else {
      User.find({}, (err, foundUsers) => {
        if (err || !foundUsers) {
          req.flash('error', 'User not found!');
          res.redirect('/application');
        } else {
          res.render('planNew', { plans: foundPlans, users: foundUsers });
        }
      });
    }
  });
});

app.post('/plan/new', middleware.isEmployee, (req, res) => {
  Plan.create(req.body.plan, (err, newPlan) => {
    if (err || !newPlan) {
      console.error(err);
      req.flash('error', 'Plan not created!');
      res.redirect('/plan/new');
    } else {
      req.flash('success', 'Plan created!');
      res.redirect('/application');
    }
  });
});

//EDIT PLAN
app.get('/plan/:id/edit', middleware.isLoggedIn, (req, res) => {
  Plan.findById(req.params.id, (err, foundPlan) => {
    if (err || !foundPlan) {
      req.flash('error', 'User not found!');
      res.redirect('/application');
    } else {
      foundPlan.execPopulate('users', (err, plan) => {
        if (err || !plan) {
          req.flash('error', `${plan.title}'s plans not found!`);
          res.redirect('/application');
        } else {
          Plan.find({}, (err, foundPlans) => {
            if (err || !foundPlans) {
              req.flash('error', 'Plans not found!');
              res.redirect('/application');
            } else {
              User.find({}, (err, foundUsers) => {
                if (err || !foundUsers) {
                  console.error(err);
                } else {
                  res.render('plan', {
                    plan: foundPlan,
                    plans: foundPlans,
                    users: foundUsers,
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});

//UPDATE PLAN
app.put('/plan/:id', middleware.isLoggedIn, (req, res) => {
  Plan.findByIdAndUpdate(
    req.params.id,
    req.body.plan,
    { useFindAndModify: false },
    (err, updatedPlan) => {
      if (err || !updatedPlan) {
        req.flash('error', 'Plan not found!');
        res.redirect('/application');
      } else {
        req.flash('success', 'Plan Updated!');
        res.redirect('/application');
      }
    }
  );
});

//DELETE PLAN
app.delete('/plan/:id', middleware.isAdmin, (req, res) => {
  Plan.findByIdAndRemove(
    req.params.id,
    { useFindAndModify: false },
    (err, foundPlan) => {
      if (err || !foundPlan) {
        console.error(err);
        req.flash('error', 'Plan not found!');
        res.redirect('back');
      } else {
        req.flash('success', 'Plan Deleted!');
        res.redirect('/application');
      }
    }
  );
});

//ADD PLAN TO USER
app.post('/plan/adduser', middleware.isEmployee, (req, res) => {
  UserPlan.create(req.body.plan, (err, newPlan) => {
    if (err) {
      console.error(err);
      res.redirect('/application');
    } else {
      User.findOne({ email: req.body.addTargetUserEmail }, (err, foundUser) => {
        if (err || !foundUser) {
          console.error(err);
          req.flash('error', 'User not found!');
          res.redirect('back');
        } else {
          newPlan.user = foundUser._id;
          foundUser.plans.push(newPlan);
          newPlan.save((err, planData) => {
            if (err) {
              console.error(err);
              req.flash('error', `User is on this plan already!`);
              res.redirect('/application');
            } else {
              foundUser.save((err, userData) => {
                if (err) {
                  console.error(err);
                  res.redirect('/application');
                } else {
                  req.flash(
                    'success',
                    `${newPlan.title} added to ${foundUser.username}`
                  );
                  res.redirect('back');
                }
              });
            }
          });
        }
      });
    }
  });
});

//SHOW USER PLANS
app.get('/user/:userid/plan/:id/show', middleware.isLoggedIn, (req, res) => {
  UserPlan.findById(req.params.id, (err, foundPlan) => {
    if (err || !foundPlan) {
      req.flash('error', 'Plan not found!');
      res.redirect('back');
    } else {
      Plan.find({}, (err, foundPlans) => {
        if (err || !foundPlans) {
          req.flash('error', 'Plans not found!');
          res.redirect('/application');
        } else {
          User.find({}, (err, foundUsers) => {
            if (err || !foundUsers) {
              console.error(err);
            } else {
              User.findOne({ _id: req.params.userid }, (err, foundUser) => {
                if (err || !foundUsers) {
                  console.error(err);
                } else {
                  res.render('show', {
                    plan: foundPlan,
                    plans: foundPlans,
                    users: foundUsers,
                    user: foundUser,
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});

//DELETE USER PLAN
app.post('/user/:userid/plan/:id/show', middleware.isEmployee, (req, res) => {
  UserPlan.findOne({ _id: req.params.id }, (err, foundPlan) => {
    if (err || !foundPlan) {
      console.error(err);
    } else {
      User.findOne({ _id: req.params.userid }, (err, foundUser) => {
        if (err || !foundUser) {
          console.error(err);
        } else {
          foundUser.plans.pull(foundPlan);
          foundUser.save((err, data) => {
            if (err || !foundUser) {
              console.error(err);
            } else {
              UserPlan.findOneAndDelete(
                { _id: req.params.id },
                (err, deleted) => {
                  if (err || !foundUser) {
                    console.error(err);
                  } else {
                    req.flash('success', 'Plan deleted!');
                    res.redirect('/application');
                  }
                }
              );
            }
          });
        }
      });
    }
  });
});

//PAY PLAN
app.post('/pay/:id', middleware.isEmployee, (req, res) => {
  UserPlan.findByIdAndUpdate(
    req.params.id,
    req.body.plan,
    { useFindAndModify: false },
    (err, updatedPlan) => {
      if (err || !updatedPlan) {
        req.flash('error', 'Plan not found!');
        res.redirect('/application');
      } else {
        req.flash('success', 'Plan paid!');
        res.redirect('/application');
      }
    }
  );
});

//NOT PAID
app.get('/notpaid', middleware.isLoggedIn, (req, res) => {
  User.find({}, (err, foundUsers) => {
    if (err) {
      console.error(err);
    } else {
      Plan.find({}, (err, foundPlans) => {
        if (err) {
          console.error(err);
        } else {
          UserPlan.find({}, (err, foundUserPlans) => {
            if (err) {
              console.error(err);
            } else {
              res.render('notpaid', {
                users: foundUsers,
                plans: foundPlans,
              });
            }
          });
        }
      });
    }
  });
});

//INFO ROUTE
app.get('/info', (req, res) => {
  res.render('info');
});

//FORGOT PASSWORD
app.get('/forgot', (req, res) => {
  res.render('forgot');
});

app.post('/forgot', function (req, res, next) {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
      function (token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: process.env.GMAIL,
            pass: process.env.GMAILPW,
          },
        });
        var mailOptions = {
          to: user.email,
          from: process.env.GMAIL,
          subject: 'RedTell Password Reset',
          text:
            'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' +
            req.headers.host +
            '/reset/' +
            token +
            '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n',
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          console.log('mail sent');
          req.flash(
            'success',
            'An e-mail has been sent to ' +
              user.email +
              ' with further instructions.'
          );
          done(err, 'done');
        });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.redirect('/forgot');
    }
  );
});

app.get('/reset/:token', function (req, res) {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', { token: req.params.token });
    }
  );
});

app.post('/reset/:token', function (req, res) {
  async.waterfall(
    [
      function (done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          function (err, user) {
            if (!user) {
              req.flash(
                'error',
                'Password reset token is invalid or has expired.'
              );
              return res.redirect('back');
            }
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, function (err) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function (err) {
                  req.logIn(user, function (err) {
                    done(err, user);
                  });
                });
              });
            } else {
              req.flash('error', 'Passwords do not match.');
              return res.redirect('back');
            }
          }
        );
      },
      function (user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: process.env.GMAIL,
            pass: process.env.GMAILPW,
          },
        });
        var mailOptions = {
          to: user.email,
          from: process.env.GMAIL,
          subject: 'Your password has been changed',
          text:
            'Hello,\n\n' +
            'This is a confirmation that the password for your account ' +
            user.email +
            ' has just been changed.\n',
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      },
    ],
    function (err) {
      res.redirect('/application');
    }
  );
});

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

//404 ROUTE
app.get('*', (req, res) => {
  res.render('404');
});

app.listen(process.env.PORT, (err) => {
  if (err) {
    console.error(`Error: ${err.message}`);
  } else {
    console.log(`App running on port ${process.env.PORT}`);
  }
});
