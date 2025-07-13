const mongoose = require('mongoose');
const consultationSchema = new mongoose.Schema({
  name: String,
  email: String,
  service: String,
  datetime: Date,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Consultation', consultationSchema);
