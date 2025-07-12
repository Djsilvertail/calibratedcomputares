// app.js
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const User = require('./models/User');
const Review = require('./models/Review');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(session({
  secret: 'your-super-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 }
}));

// Hardcoded reviews
const starterReviews = [
  { customer: "Jayna Forgie", text: "Dana has been a lifesaver...", image: "/images/review1.jpg", rating: 5 },
  { customer: "Sam Reynolds", text: "Excellent service...", image: "/images/review2.jpg", rating: 5 },
  { customer: "Alex Kim", text: "Professional, efficient...", image: "/images/review3.jpg", rating: 5 }
];

// Routes
app.get('/', (req, res) => {
  res.render('index', { req });
});

app.get('/about', (req, res) => {
  res.render('about', { req });
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('register', { error: 'Passwords do not match.' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('register', { error: 'This email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    req.session.user = {
      _id: newUser._id,
      username: newUser.username
    };

    res.redirect('/');
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).render('register', { error: 'An error occurred during registration.' });
  }
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('login', { error: 'Invalid email or password.' });
    }
    req.session.user = {
      _id: user._id,
      username: user.username
    };
    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).render('login', { error: 'An error occurred during login.' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/reviews', async (req, res) => {
  try {
    const dbReviews = await Review.find().sort({ createdAt: -1 });
    const allReviews = [...starterReviews, ...dbReviews];
    res.render('reviews', { reviews: allReviews, req });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).send('Unable to load reviews');
  }
});

app.post('/reviews', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).send('Unauthorized: You must be logged in to leave a review.');
  }

  const { name, text, rating } = req.body;
  try {
    const newReview = new Review({ name, text, rating });
    await newReview.save();
    res.redirect('/reviews');
  } catch (err) {
    console.error('Error saving review:', err);
    res.status(500).send('There was an error saving your review. Please try again.');
  }
});

// Contact form
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
    res.redirect('/?contact=success');
  } catch (err) {
    console.error('Error sending contact email:', err);
    res.status(500).send('Something went wrong. Please try again later.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
