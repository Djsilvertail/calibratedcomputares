const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use(session({
  secret: 'your-super-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://127.0.0.1:27017/calibrated-auth' }),
  cookie: { maxAge: 1000 * 60 * 60 }
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId;
  next();
});

// Sample reviews for demonstration
const reviews = [
  { customer: "Jayna Forgie", text: "Dana has been a lifesaver...", image: "/images/review1.jpg" },
  { customer: "Sam Reynolds", text: "Excellent service...", image: "/images/review2.jpg" },
  { customer: "Alex Kim", text: "Professional, efficient...", image: "/images/review3.jpg" }
];

// Public pages
app.get('/', (req, res) => res.render('index'));
app.get('/about', (req, res) => res.render('about'));
app.get('/services', (req, res) => res.render('services'));
app.get('/reviews', (req, res) => res.render('reviews', { reviews }));

// Reviews submission
app.post('/reviews', (req, res) => {
  const { name, text } = req.body;
  reviews.push({ customer: name, text, image: "/images/default-review.jpg" });
  res.redirect('/reviews');
});

// Contact form with Nodemailer
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.EMAIL_USER,
      subject: `New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    await transporter.sendMail(mailOptions);

    console.log(`Contact form email sent from ${email}`);
    res.send('<h1>Thank you for contacting me!</h1><p>Your message has been sent successfully.</p><a href="/">Back to home</a>');
  } catch (err) {
    console.error('Error sending contact email:', err);
    res.status(500).send('<h1>Oops!</h1><p>Something went wrong. Please try again later.</p><a href="/">Back to home</a>');
  }
});

// Portfolio page (logged in users)
app.get('/portfolio', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.render('portfolio');
});

// Booking consultation
app.get('/book-consultation', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.render('book-consultation');
});

app.post('/book-consultation', (req, res) => {
  const { name, email, service, details } = req.body;
  console.log(`Consultation requested by ${name} for ${service}.`);
  res.send('<h1>Thank you for booking!</h1><p>I will contact you shortly.</p><a href="/">Back to Home</a>');
});

// Service subpages
const servicePaths = [
  "web-basic", "web-standard", "web-premium",
  "tech-basic", "tech-standard", "tech-premium",
  "maintenance-monthly", "maintenance-yearly",
  "social-starter", "social-growth", "social-elite"
];

servicePaths.forEach(service => {
  app.get(`/services/${service}`, (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.render(`services/${service}`);
  });
});

// Authentication routes
app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 12);
    const user = new User({ username, password: hashed });
    await user.save();
    req.session.userId = user._id;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.redirect('/register');
  }
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.redirect('/login');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.redirect('/login');

    req.session.userId = user._id;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.redirect('/');
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
