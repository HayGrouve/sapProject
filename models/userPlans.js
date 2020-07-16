const mongoose = require('mongoose');

const userPlanSchema = new mongoose.Schema({
  title: { type: String, unique: true, required: true },
  minutes: { type: Number },
  data: { type: Number },
  sms: { type: Number },
  isPaid: { type: Boolean, default: false },
  startDate: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('UserPlan', userPlanSchema);
