const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize scores file if it doesn't exist
if (!fs.existsSync(SCORES_FILE)) {
    fs.writeFileSync(SCORES_FILE, JSON.stringify([]));
}

// API: Get Top 5 Scores
app.get('/api/scores', (req, res) => {
    try {
        const data = fs.readFileSync(SCORES_FILE, 'utf8');
        let scores = JSON.parse(data);
        
        // Sort descending and take top 5
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 5);
        
        res.json(scores);
    } catch (err) {
        console.error('Error reading scores:', err);
        res.status(500).json({ error: 'Failed to read scores' });
    }
});

// API: Submit a New Score
app.post('/api/scores', (req, res) => {
    try {
        const { name, score } = req.body;
        
        if (!name || typeof score !== 'number') {
            return res.status(400).json({ error: 'Invalid data format' });
        }
        
        const data = fs.readFileSync(SCORES_FILE, 'utf8');
        const scores = JSON.parse(data);
        
        // Add new score
        scores.push({
            name: name.substring(0, 10).toUpperCase(), // Keep it max 10 chars, uppercase
            score: score,
            date: new Date().toISOString()
        });
        
        // Sort descending and keep top 50 overall to prevent file bloat
        scores.sort((a, b) => b.score - a.score);
        const topScores = scores.slice(0, 50);
        
        fs.writeFileSync(SCORES_FILE, JSON.stringify(topScores, null, 2));
        
        res.json({ success: true, message: 'Score saved!' });
    } catch (err) {
        console.error('Error saving score:', err);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

app.listen(PORT, () => {
    console.log(`Node server running on http://localhost:${PORT}`);
});
