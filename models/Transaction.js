const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uid: {
    type: String,
    required: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['borrow', 'return'],
    required: true
  },
  bookTitle: {
    type: String,
    default: 'Unknown Book'
  },
  bookCode: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  returnDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'overdue'],
    default: function() {
      return this.type === 'borrow' ? 'active' : 'completed';
    }
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
transactionSchema.index({ uid: 1, timestamp: -1 });
transactionSchema.index({ user: 1, status: 1 });

// Virtual for formatted date
transactionSchema.virtual('formattedDate').get(function() {
  return this.timestamp.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

module.exports = mongoose.model('Transaction', transactionSchema);