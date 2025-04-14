console.log("Ứng dụng đang khởi động...");

// 1. Require các thư viện trước
const express = require('express');
const cors = require('cors');  // Thêm dòng này
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// 2. Khởi tạo app
const app = express();

// 3. Sử dụng middleware sau khi app được khởi tạo
app.use(cors());  // Đúng vị trí: sau khi có app
app.use(express.json());

// 4. Các cài đặt khác
const PORT = process.env.PORT || 3000;



// Initialize database
const db = new sqlite3.Database('./tracking.db', (err) => {
    if (err) {
        console.error('Lỗi kết nối database:', err);
    } else {
        console.log('Kết nối database thành công');
    }
});

// Create public directory if not exists
if (!fs.existsSync('public')) fs.mkdirSync('public');
if (!fs.existsSync('public/index.html')) {
    fs.writeFileSync('public/index.html', '<h1>Default Page</h1>');
}

// Create tables if they don't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS links (
            id TEXT PRIMARY KEY,
            name TEXT,
            target_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            link_id TEXT,
            ip_address TEXT,
            user_agent TEXT,
            latitude REAL,
            longitude REAL,
            city TEXT,
            region TEXT,
            country TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (link_id) REFERENCES links (id)
        )
    `);
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoints
app.post('/api/links', (req, res) => {
    const { targetUrl, linkName } = req.body;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'Thiếu URL đích' });
    }

    const linkId = uuidv4();
    db.run(
        'INSERT INTO links (id, name, target_url) VALUES (?, ?, ?)',
        [linkId, linkName || null, targetUrl],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Lỗi database' });
            }
            
            res.json({
                trackingLink: `${req.protocol}://${req.get('host')}/t/${linkId}`
            });
        }
    );
});

app.get('/api/links', (req, res) => {
    db.all(`
        SELECT l.id, l.name, l.target_url, COUNT(v.id) as visits, 
               MAX(v.timestamp) as last_visit
        FROM links l
        LEFT JOIN visits v ON l.id = v.link_id
        GROUP BY l.id
        ORDER BY l.created_at DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/visits/:linkId', (req, res) => {
    db.all(
        'SELECT * FROM visits WHERE link_id = ? ORDER BY timestamp DESC',
        [req.params.linkId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.get('/api/locations/:linkId', (req, res) => {
    db.all(
        `SELECT latitude, longitude, city, region, country, 
                timestamp, ip_address, user_agent 
         FROM visits 
         WHERE link_id = ? 
         ORDER BY timestamp DESC`,
        [req.params.linkId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Tracking endpoint
app.get('/t/:linkId', (req, res) => {
    const { linkId } = req.params;
    
    db.get('SELECT target_url FROM links WHERE id = ?', [linkId], (err, row) => {
        if (err || !row) return res.status(404).send('Link not found');
        
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.get('User-Agent');
        
        const geoData = getMockGeolocation(ip);
        
        db.run(
            'INSERT INTO visits (link_id, ip_address, user_agent, latitude, longitude, city, region, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [linkId, ip, userAgent, geoData.latitude, geoData.longitude, geoData.city, geoData.region, geoData.country],
            function(err) {
                if (err) console.error('Failed to record visit:', err);
                res.redirect(row.target_url);
            }
        );
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function getMockGeolocation(ip) {
    if (ip === '::1' || ip === '127.0.0.1') {
        return {
            latitude: 10.8231,
            longitude: 106.6297,
            city: "Ho Chi Minh City",
            region: "Ho Chi Minh",
            country: "Vietnam"
        };
    }
    
    return {
        latitude: 10 + Math.random() * 5,
        longitude: 105 + Math.random() * 5,
        city: "Vietnam City",
        region: "Vietnam Region",
        country: "Vietnam"
    };
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});