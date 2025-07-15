const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    default: function() {
      return `User_${this.uid}`;
    }
  },
  email: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  totalBorrowed: {
    type: Number,
    default: 0
  },
  totalReturned: {
    type: Number,
    default: 0
  },
  currentlyBorrowing: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return this.name || `User_${this.uid}`;
});

module.exports = mongoose.model('User', userSchema);