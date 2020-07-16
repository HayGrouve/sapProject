const mongoose = require('mongoose'),
  passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  plans: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
    },
  ],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  isEmployee: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
});

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('User', userSchema);
