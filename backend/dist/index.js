"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const complaints_1 = __importDefault(require("./routes/complaints"));
const auth_1 = __importDefault(require("./routes/auth"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const error_1 = require("./middleware/error");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Security Middleware
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false }));
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // increased to 1000 for polling support
    message: {
        status: 429,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});
app.use('/api/', limiter);
// Connect to MongoDB
mongoose_1.default.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
// Routes
app.use('/api/complaints', complaints_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/notifications', notifications_1.default);
// Serve uploads folder statically
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.get('/', (req, res) => {
    res.send('API is running with production-grade architecture...');
});
// Global Error Handler
app.use(error_1.errorHandler);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
