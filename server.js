require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const Groq = require('groq-sdk');
const cors = require('cors');

const { User, ErrorLog } = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.error("❌ DB Error:", err));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.json({ message: "Success" });
    } catch (err) { res.status(500).json({ error: "Register failed" }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        res.json({ email: user.email, redirect: "/user/index.html" });
    } catch (err) { res.status(500).json({ error: "Login failed" }); }
});

// --- ELI5 RECIPE GENERATOR ---
app.post('/api/generate-recipe', async (req, res) => {
    try {
        const { ingredients, dietary, cuisine, userEmail } = req.body;
        if (!userEmail) return res.status(401).json({ error: "Login required" });

        await User.findOneAndUpdate({ email: userEmail }, { 
            $set: { lastActive: new Date() },
            $push: { searchHistory: { ingredients, cuisine, dietary, date: new Date() } } 
        });

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a teacher for a 5-year-old. Use very simple English. Explain every physical action (like cracking eggs) and give exact waiting times (e.g., 'Wait 3 minutes'). Format with TITLE:, STATS:, ### WHAT YOU NEED, ### PREPARATION, ### LET'S COOK." },
                { role: "user", content: `How do I cook ${cuisine} ${dietary} with: ${ingredients}?` }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.5
        });
        res.json({ recipes: chatCompletion.choices[0].message.content });
    } catch (error) {
        await new ErrorLog({ message: error.message }).save();
        res.status(500).json({ error: "AI Error" });
    }
});

// --- ADMIN API ROUTES ---
app.get('/api/admin/all-users', async (req, res) => {
    const users = await User.find().sort({ lastActive: -1 });
    res.json(users);
});

app.get('/api/admin/live-feed', async (req, res) => {
    const users = await User.find({ "searchHistory.0": { $exists: true } });
    let feed = [];
    users.forEach(u => u.searchHistory.forEach(s => feed.push({ email: u.email, ...s._doc })));
    res.json(feed.sort((a,b) => b.date - a.date).slice(0, 10));
});

app.get('/api/admin/errors', async (req, res) => {
    const errors = await ErrorLog.find().sort({ timestamp: -1 }).limit(10);
    res.json(errors);
});

// --- ROUTE FIX: Admin Page ---
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'admin.html'));
});

app.listen(PORT, () => console.log(`🚀 SpiceSpark Server: http://localhost:${PORT}`));