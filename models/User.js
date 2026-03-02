const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    // New: User Profile Preferences
    profile: {
        defaultDietary: { type: String, default: 'None' },
        defaultCuisine: { type: String, default: 'Any' }
    },
    // New: Saved Recipes
    savedRecipes: [{
        title: String,
        content: String,
        date: { type: Date, default: Date.now }
    }],
    searchHistory: [{
        ingredients: String,
        cuisine: String,
        dietary: String,
        date: { type: Date, default: Date.now }
    }]
});

const ErrorLogSchema = new mongoose.Schema({
    message: String,
    stack: String,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const ErrorLog = mongoose.model('ErrorLog', ErrorLogSchema);

module.exports = { User, ErrorLog };