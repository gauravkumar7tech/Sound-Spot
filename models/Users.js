const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z ]+$/.test(v); // Only allows alphabets and spaces
      },
      message: props => `${props.value} is not a valid name (only alphabets and spaces allowed)`
    },
  },
  password: {
    type: String,
    required: false,
    minlength: [3, 'Password must be at least 3 characters long'],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    },
  },
  phone: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit phone number!`
    },
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: false,
  },
  country: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    enum: ['user', 'admin'],
    required: true,
  },
  socialAccounts: [{
    provider: {
      type: String,
      enum: ['google', 'facebook', 'github', 'linkedin'],
      required: true,
    },
    providerId: {
      type: String,
      required: true,
    },
  }],
  verificationToken: {
    type: String,
  },
  verificationCodeHash: {
    type: String,
  },
  verificationCodeExpiresAt: {
    type: Date,
  },
  verificationCodeSentAt: {
    type: Date,
  },
  verificationAttempts: {
    type: Number,
    default: 0,
  },
  verificationMethod: {
    type: String,
    enum: ['email', 'phone'],
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  dob: {
    type: Date,
  },
  planType: {
    type: String,
  },
  planStartDate: {
    type: Date,
  },
  planRenewalDate: {
    type: Date,
  },
  billingInfo: {
    type: String,
  },
  paymentMethod: {
    type: String,
  },
  totalListeningTime: {
    type: Number,
  },
  playlistsCreated: {
    type: Number,
  },
  songsUploaded: {
    type: Number,
  },
  followers: {
    type: Number,
  },
  following: {
    type: Number,
  },
  likedSongs: {
    type: Number,
  },
  recentlyPlayedSong: {
    type: String,
  },
  mostPlayedPlaylist: {
    type: String,
  },
  topGenre: {
    type: String,
  },
  lastSongFavorited: {
    type: String,
  },
  passwordStrength: {
    type: String,
  },
  passwordLastUpdated: {
    type: Date,
  },
  accountStatus: {
    type: String,
  },
  twoFactorAuth: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
  },
  lastLoginIp: {
    type: String,
  },
  lastLoginDevice: {
    type: String,
  },
  recentPasswordChanges: {
    type: Array,
  },
  failedLoginAttempts: {
    type: Number,
  },
  accessedFromNewDevice: {
    type: Boolean,
  },
  lastAccess: {
    type: Date,
  }
});


module.exports = mongoose.model('User', userSchema);
