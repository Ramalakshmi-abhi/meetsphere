require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "https://meetsphere-ten.vercel.app",
    "https://meetsphere.vercel.app"
];

const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// Middleware
const path = require('path');
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB Connection logic (Cached for Serverless)
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const dbOptions = {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        console.log('Creating new MongoDB connection promise...');
        
        // Hard timeout for the connection attempt
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Mongoose connection timed out (Hard Limit)')), 15000)
        );

        cached.promise = Promise.race([
            mongoose.connect(process.env.MONGODB_URI, dbOptions),
            timeoutPromise
        ]).then((m) => {
            console.log('MongoDB connected successfully');
            return m;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null; // Reset promise so we can try again
        console.error('CRITICAL: MongoDB connection error:', e.message);
        throw e;
    }

    return cached.conn;
};

// Initial connection attempt (swallowed to let health check report it)
connectDB().catch(() => {});

// Health check route
app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        await connectDB();
        dbStatus = 'connected';
    } catch (e) {
        dbStatus = 'error: ' + e.message;
    }

    res.send({ 
        status: dbStatus,
        mongoose_state: mongoose.connection.readyState,
        mongoose_version: mongoose.version,
        time: new Date().toISOString()
    });
});

// Email Diagnostic Route
const { sendInvitation } = require('./config/email');
app.get('/api/health/email', async (req, res) => {
    try {
        const result = await sendInvitation(process.env.EMAIL_USER, 'test-id', 'Test-Host');
        res.send({ 
            success: result.success, 
            message: result.success ? 'Test email sent to yourself!' : 'Failed to send test email',
            error: result.error ? result.error.message : null
        });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

const users = {};
const socketToRoom = {};
const socketToName = {};

io.on('connection', (socket) => {
    socket.on('join-room', (roomID, socketId, userName) => {
        if (users[roomID]) {
            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        socketToName[socket.id] = userName || 'Guest';
        
        // Return array of objects containing both id and name
        const usersInThisRoom = users[roomID]
            .filter(id => id !== socket.id)
            .map(id => ({ id, name: socketToName[id] }));

        socket.emit('all-users', usersInThisRoom);
    });

    socket.on('check-host', (roomID) => {
        if (users[roomID] && users[roomID][0] === socket.id) {
            socket.emit('host-check-result', true);
        } else {
            socket.emit('host-check-result', false);
        }
    });

    socket.on('sending-signal', payload => {
        io.to(payload.userToSignal).emit('user-joined', { 
            signal: payload.signal, 
            callerID: payload.callerID,
            callerName: socketToName[payload.callerID] || 'Guest'
        });
    });

    socket.on('returning-signal', payload => {
        io.to(payload.callerID).emit('receiving-returned-signal', { 
            signal: payload.signal, 
            id: socket.id,
            name: socketToName[socket.id] || 'Guest'
        });
    });

    socket.on('mute-user', payload => {
        io.to(payload.userID).emit('mute-action', payload);
    });

    socket.on('remove-user', payload => {
        io.to(payload.userID).emit('remove-action', payload);
    });

    socket.on('send-message', payload => {
        io.to(payload.roomID).emit('message-received', payload);
    });

    socket.on('leave-room', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
        delete socketToRoom[socket.id];
        socket.broadcast.emit('user-disconnected', socket.id);
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
        delete socketToRoom[socket.id];
        socket.broadcast.emit('user-disconnected', socket.id);
    });
});

// Admin Stats API
const Meeting = require('./models/Meeting');
const User = require('./models/User');

app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalMeetings = await Meeting.countDocuments();
        const activeMeetingsCount = Object.keys(users).length;
        
        res.send({
            totalUsers,
            totalMeetings,
            activeMeetingsCount,
            storageUsage: '1.2 GB'
        });
    } catch (e) {
        res.status(500).send(e);
    }
});

// Routes
const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meeting');
const contactRoutes = require('./routes/contact');
app.use('/api/auth', authRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/contacts', contactRoutes);

// Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
