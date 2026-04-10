const request = require('supertest');
const app = require('../server');
const fs = require('fs');
const path = require('path');

const SCORES_FILE = path.join(__dirname, '../scores.json');

describe('Snake Global API', () => {
    // Before all tests, backing up scores and creating dummy data
    beforeAll(() => {
        // Just mock the file with a specific setup
        fs.writeFileSync(
            SCORES_FILE,
            JSON.stringify([
                { name: 'AAA', score: 50, date: new Date().toISOString() },
                { name: 'BBB', score: 30, date: new Date().toISOString() }
            ])
        );
    });

    it('GET /api/scores should retrieve the global top scores', async () => {
        const response = await request(app).get('/api/scores');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);
        expect(response.body[0].name).toBe('AAA'); // since 50 > 30
    });

    it('POST /api/scores should append a new valid score to the leaderboard', async () => {
        const payload = {
            name: 'NEW',
            score: 100
        };
        const response = await request(app).post('/api/scores').send(payload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Fetch to ensure it was injected properly and sorted securely
        const fetchRes = await request(app).get('/api/scores');
        expect(fetchRes.body[0].name).toBe('NEW');
        expect(fetchRes.body[0].score).toBe(100);
    });

    it('POST /api/scores should reject malformed payload', async () => {
        const payload = {
            score: 'One Hundred Strings' // invalid data type and missing name
        };
        const response = await request(app).post('/api/scores').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid data format');
    });
});
