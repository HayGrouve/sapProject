const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  title: { type: String, unique: true, required: true },
  minutes: { type: Number },
  data: { type: Number },
  sms: { type: Number },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
});

module.exports = mongoose.model('Plan', planSchema);
