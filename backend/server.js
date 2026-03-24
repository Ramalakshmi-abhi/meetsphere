const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const isPrivateNetworkHostname = (hostname = '') => (
    /^10\.\d+\.\d+\.\d+$/.test(hostname)
    || /^192\.168\.\d+\.\d+$/.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
);
const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://meetsphere-ten.vercel.app",
    "https://meetsphere.vercel.app",
    trimTrailingSlash(process.env.FRONTEND_URL || '')
].filter(Boolean));

const isAllowedOrigin = (origin) => {
    if (!origin) {
        return true;
    }

    const normalizedOrigin = trimTrailingSlash(origin);
    if (allowedOrigins.has(normalizedOrigin)) {
        return true;
    }

    try {
        const { hostname } = new URL(normalizedOrigin);
        return hostname === 'localhost'
            || hostname === '127.0.0.1'
            || hostname === '::1'
            || isPrivateNetworkHostname(hostname)
            || hostname.endsWith('.vercel.app');
    } catch {
        return false;
    }
};

const corsOptions = {
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        console.warn(`Blocked CORS origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
};

// Socket.IO setup with better polling support and timeouts
const io = socketIo(server, {
    cors: corsOptions,
    path: '/socket.io',
    pingTimeout: 60000,       // Increased for Railway wake-up delays
    pingInterval: 25000,
    transports: ['polling', 'websocket'],  // Explicitly allow both (polling first)
    reconnection: true,
    reconnectionAttempts: 30,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 10000,
    timeout: 30000
});

io.engine.on('connection_error', (err) => {
    console.warn('[Socket.IO Engine Error]', {
        code: err.code,
        message: err.message,
        context: err.context,
    });
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log ALL incoming requests (critical for debugging polling and API 404s)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
    next();
});

// DB Connection (cached for serverless compatibility)
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

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Mongoose connection timed out')), 15000)
        );

        cached.promise = Promise.race([
            mongoose.connect(process.env.MONGODB_URI, dbOptions),
            timeoutPromise
        ]).then((m) => {
            console.log('MongoDB connected successfully');
            return m;
        }).catch(err => {
            console.error('MongoDB connection failed:', err);
            cached.promise = null;
            throw err;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error('CRITICAL: MongoDB connection error:', e.message);
        throw e;
    }

    return cached.conn;
};

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

    res.json({
        status: dbStatus,
        mongoose_state: mongoose.connection.readyState,
        mongoose_version: mongoose.version,
        time: new Date().toISOString()
    });
});

// Email diagnostic route
const { sendInvitation } = require('./config/email');
app.get('/api/health/email', async (req, res) => {
    try {
        const result = await sendInvitation(process.env.EMAIL_USER, 'test-id', 'Test-Host');
        res.json({
            success: result.success,
            message: result.success ? 'Test email sent to yourself!' : 'Failed to send test email',
            error: result.error ? result.error.message : null
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Socket.IO connection handler
const users = {};          // roomID → [socket.id, ...]
const socketToRoom = {};   // socket.id → roomID
const socketToName = {};   // socket.id → userName
const getUsersInRoom = (roomID) => (users[roomID] || []).map((id) => ({
    id,
    name: socketToName[id] || 'Guest'
}));

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id} (transport: ${socket.conn.transport.name})`);

    socket.on('join-room', (roomID, _socketId, userName) => {
        console.log(`User ${userName || 'Guest'} (${socket.id}) joining room ${roomID}`);
        socket.join(roomID);
        if (users[roomID]) {
            if (!users[roomID].includes(socket.id)) {
                users[roomID].push(socket.id);
            }
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        socketToName[socket.id] = userName || 'Guest';

        const usersInThisRoom = getUsersInRoom(roomID)
            .filter((user) => user.id !== socket.id);

        socket.emit('all-users', usersInThisRoom);
        io.to(roomID).emit('room-users', getUsersInRoom(roomID));
        socket.to(roomID).emit('user-joined-room', { id: socket.id, name: socketToName[socket.id] });
    });

    socket.on('check-host', (roomID) => {
        const isHost = users[roomID] && users[roomID][0] === socket.id;
        socket.emit('host-check-result', isHost);
    });

    socket.on('ice-candidate', (payload) => {
        const { target, candidate } = payload;
        if (target && candidate) {
            io.to(target).emit('ice-candidate', { from: socket.id, candidate });
            console.log(`ICE candidate forwarded from ${socket.id} to ${target}`);
        }
    });

    socket.on('sending-signal', payload => {
        console.log(`Sending signal from ${socket.id} to ${payload.userToSignal}`);
        io.to(payload.userToSignal).emit('user-joined', {
            signal: payload.signal,
            callerID: payload.callerID,
            callerName: socketToName[payload.callerID] || 'Guest'
        });
    });

    socket.on('returning-signal', payload => {
        console.log(`Returning signal from ${socket.id} to ${payload.callerID}`);
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
        handleUserDisconnect(socket);
    });

    socket.on('disconnect', (reason) => {
        console.log(`Socket ${socket.id} disconnected: ${reason}`);
        handleUserDisconnect(socket);
    });
});

function handleUserDisconnect(socket) {
    const roomID = socketToRoom[socket.id];
    if (roomID) {
        socket.leave(roomID);
        let room = users[roomID];
        if (room) {
            users[roomID] = room.filter(id => id !== socket.id);
            if (users[roomID].length === 0) {
                delete users[roomID];
            }
        }
        delete socketToRoom[socket.id];
        delete socketToName[socket.id];

        socket.to(roomID).emit('user-disconnected', socket.id);
        io.to(roomID).emit('room-users', getUsersInRoom(roomID));
        console.log(`User ${socket.id} left room ${roomID}`);
    }
}

// Admin stats
const Meeting = require('./models/Meeting');
const User = require('./models/User');

app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalMeetings = await Meeting.countDocuments();
        const activeMeetingsCount = Object.keys(users).length;

        res.json({
            totalUsers,
            totalMeetings,
            activeMeetingsCount,
            storageUsage: '1.2 GB'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Routes
const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meeting');
const contactRoutes = require('./routes/contact');

app.use('/api/auth', authRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/contacts', contactRoutes);

// Serve frontend (SPA fallback)
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowed origins: ${Array.from(allowedOrigins).join(', ')}`);
});

module.exports = app;
