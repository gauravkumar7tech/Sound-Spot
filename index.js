require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { connectToMongoDB } = require('./config/mongo.js');
const { setupRoutes } = require('./routes/routes.js');
const app = express();
const path = require('path');
const passport = require('passport');
const { oauthBaseUrl } = require('./config/passport.js');

app.set('trust proxy', 1);
app.locals.oauthBaseUrl = oauthBaseUrl;

const cors = require('cors');
const allowedOrigins = [
  'https://soundspot-56c18f9a9a1e.onrender.com',
  'https://sound-spot-music-web-application-1ud6ag6hz.vercel.app',
  'https://soundspot-music-web.com',
  'https://www.soundspot-music-web.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});


// Route to serve uploaded files
app.get('/uploads/:file', (req, res) => {
  const file = req.params.file;
  const filePath = path.join(__dirname, 'uploads', file);

  if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
    res.type('image/jpeg');
  } else if (file.endsWith('.mp3') || file.endsWith('.mpeg')) {
    res.type('audio/mpeg');
  } else {
    return res.status(400).send('File type not supported');
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('File not found');
    }
  });
});

// Set view engine
app.set('view engine', 'ejs');

// Connect to MongoDB
connectToMongoDB();

// Express session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' || process.env.RENDER === 'true',
    },
  })
);
app.use(passport.initialize());

// Setup routes
setupRoutes(app);

const PORT = Number(process.env.PORT) || 5000;

const startServer = (port) => {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`server is running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = port + 1;
      console.warn(`Port ${port} is busy. Retrying on ${fallbackPort}...`);
      startServer(fallbackPort);
      return;
    }

    console.error('Server startup error:', err);
    process.exit(1);
  });
};

startServer(PORT);
