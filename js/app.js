const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Review = require('./models/Review');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 }
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  next();
});

// Starter Reviews
const starterReviews = [
  {
    customer: "Jayna Forgie",
    text: "Dana has been a lifesaver when it comes to all my computer issues. He’s patient, professional, and always goes above and beyond.",
    image: "/images/review1.jpg",
    rating: 5
  },
  {
    customer: "Sam Reynolds",
    text: "Excellent service and quick turnaround! My website looks amazing, and I couldn’t be happier with the process from start to finish.",
    image: "/images/review2.jpg",
    rating: 5
  },
  {
    customer: "Alex Kim",
    text: "Professional, efficient, and incredibly knowledgeable. Dana handled everything seamlessly and delivered exactly what I needed.",
    image: "/images/review3.jpg",
    rating: 5
  }
];

// Public Pages
app.get('/', (req, res) => res.render('index', { req }));
app.get('/about', (req, res) => res.render('about', { req }));
app.get('/services', (req, res) => res.render('services', { req }));

// Reviews
app.get('/reviews', async (req, res) => {
  try {
    const dbReviews = await Review.find().sort({ createdAt: -1 });
    const allReviews = [...starterReviews, ...dbReviews];
    res.render('reviews', { reviews: allReviews, req });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.render('reviews', { reviews: starterReviews, req, error: 'Unable to load user reviews.' });
  }
});

app.post('/reviews', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).send('Unauthorized');
  }

  const { name, text, rating } = req.body;
  try {
    const newReview = new Review({ name, text, rating });
    await newReview.save();
    res.redirect('/reviews');
  } catch (err) {
    console.error('Error saving review:', err);
    res.status(500).send('Error saving review');
  }
});

// Contact
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: process.env.EMAIL_USER,
      subject: `New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    });

    console.log(`Contact form email sent from ${email}`);
    res.redirect('/?contact=success');
  } catch (err) {
    console.error('Error sending contact email:', err);
    res.status(500).send('Something went wrong. Please try again later.');
  }
});

// Booking
app.get('/book-consultation', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('book-consultation', { req });
});

app.post('/book-consultation', (req, res) => {
  const { name, email, service, details } = req.body;
  console.log(`Consultation requested by ${name} for ${service}.`);
  res.send('<h1>Thank you for booking!</h1><p>I will contact you shortly.</p><a href="/">Back to Home</a>');
});

// Service Subpages
const servicePaths = [
  "web-basic", "web-standard", "web-premium",
  "tech-basic", "tech-standard", "tech-premium",
  "maintenance-monthly", "maintenance-yearly",
  "social-starter", "social-growth", "social-elite"
];

servicePaths.forEach(service => {
  app.get(`/services/${service}`, (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render(`services/${service}`, { req });
  });
});

// Authentication
app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  try {
    if (password !== confirmPassword) {
      return res.render('register', { error: 'Passwords do not match.' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.render('register', { error: 'Email already in use.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = new User({ username, password: hash });
    await user.save();

    req.session.user = {
      _id: user._id,
      username: user.username
    };

    // Send welcome email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: username,
      subject: 'Welcome to Calibrated Computares!',
      text: `Hi ${username},\n\nThank you for registering! You can now log in and access exclusive features.\n\nCheers,\nDana Llewellyn`
    });

    res.redirect('/');
  } catch (err) {
    console.error('Error registering user:', err);
    res.render('register', { error: 'An error occurred during registration.' });
  }
});

app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { error: 'Invalid credentials.' });
  }
  req.session.user = {
    _id: user._id,
    username: user.username
  };
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.redirect('/');
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
