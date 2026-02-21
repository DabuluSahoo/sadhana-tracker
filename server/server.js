const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./config/db');
require('./jobs/reminder');

dotenv.config();

// Run schema fix on startup (ensure columns exist)
const fixSchema = require('./fix_schema');
fixSchema();

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sadhana', require('./routes/sadhanaRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/debug', require('./routes/debugRoutes'));

app.get('/', (req, res) => {
    res.send('Sadhana Tracker API Running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
