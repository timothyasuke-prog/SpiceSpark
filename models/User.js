const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // fields used for password reset workflow
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastActive: { type: Date, default: Date.now },
    savedRecipes: [{ title: String, content: String }],
    searchHistory: [{
        ingredients: String,
        cuisine: String,
        dietary: String,
        date: { type: Date, default: Date.now }
    }]
});

const ErrorLogSchema = new mongoose.Schema({
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const ErrorLog = mongoose.model('ErrorLog', ErrorLogSchema);

// Make sure you are exporting BOTH like this:
module.exports = { User, ErrorLog };