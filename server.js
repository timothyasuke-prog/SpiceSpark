require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const Groq = require('groq-sdk');
const cors = require('cors');

// Import your models
const { User, ErrorLog } = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Database Connected Successfully"))
    .catch(err => console.error("❌ Database Connection Error:", err));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- 1. ROOT REDIRECT (Fixes "Cannot GET /") ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- 2. AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.json({ message: "Account Created" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed. Email might already exist." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        // Send email back so frontend can store it in localStorage
        res.json({ email: user.email, redirect: "/user/index.html" });
    } catch (err) {
        res.status(500).json({ error: "Login process failed." });
    }
});

// --- 3. THE "ELI5" RECIPE GENERATOR (Protected) ---
app.post('/api/generate-recipe', async (req, res) => {
    try {
        const { ingredients, dietary, cuisine, userEmail } = req.body;

        // Security Check
        if (!userEmail || userEmail === "null") {
            return res.status(401).json({ error: "Unauthorized. Please login." });
        }

        // Log user activity
        await User.findOneAndUpdate({ email: userEmail }, { 
            $set: { lastActive: new Date() },
            $push: { searchHistory: { ingredients, cuisine, dietary, date: new Date() } } 
        });

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are a patient cooking teacher for a 5-year-old or a total beginner. 
                    Explain everything step-by-step using very light, simple English.
                    Explain physical actions (e.g., 'Crack the egg by tapping it on the table').
                    Include exact waiting times for every step (e.g., 'Wait for 3 minutes').
                    
                    Strictly follow this layout:
                    TITLE: [Simple Name]
                    STATS: ⏱ Total Time: [Time] | 🍴 Serves: [Amount] | 🏆 Level: Super Easy
                    
                    ### 🛒 THINGS YOU NEED
                    [ ] [Quantity] [Item]
                    
                    ### 🔪 GET READY
                    Simple prep steps before you start cooking.
                    
                    ### 🍳 LET'S COOK!
                    1. **Action**: Detailed instruction with time and what to look for.
                    
                    ### 💡 CHEF'S SECRET
                    One tiny, helpful tip.` 
                },
                { role: "user", content: `Explain how to cook ${cuisine} ${dietary} using only: ${ingredients}` }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.5
        });

        res.json({ recipes: chatCompletion.choices[0].message.content });
    } catch (error) {
        console.error("AI Error:", error);
        await new ErrorLog({ message: error.message }).save();
        res.status(500).json({ error: "The Chef is tired. Please try again." });
    }
});

// --- 4. USER DATA ROUTES ---
app.post('/api/user/save-recipe', async (req, res) => {
    try {
        const { email, title, content } = req.body;
        await User.findOneAndUpdate({ email }, { $push: { savedRecipes: { title, content } } });
        res.json({ message: "Recipe Saved!" });
    } catch (err) { res.status(500).json({ error: "Save failed" }); }
});

app.get('/api/user/my-recipes/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        res.json(user ? user.savedRecipes : []);
    } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

// --- 5. ADMIN DASHBOARD ROUTES ---
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'admin.html'));
});

app.get('/api/admin/all-users', async (req, res) => {
    const users = await User.find().sort({ lastActive: -1 });
    res.json(users);
});

app.get('/api/admin/live-feed', async (req, res) => {
    try {
        const users = await User.find({ "searchHistory.0": { $exists: true } });
        let feed = [];
        users.forEach(u => u.searchHistory.forEach(s => feed.push({ email: u.email, ...s._doc })));
        res.json(feed.sort((a,b) => b.date - a.date).slice(0, 10));
    } catch (err) { res.status(500).json({ error: "Feed failed" }); }
});

app.get('/api/admin/errors', async (req, res) => {
    const errors = await ErrorLog.find().sort({ timestamp: -1 }).limit(10);
    res.json(errors);
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 SpiceSpark is cooking at http://localhost:${PORT}`);
});