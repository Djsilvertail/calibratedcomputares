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

console.log('MongoDB URI at runtime:', process.env.MONGODB_URI);

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 }
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId;
  next();
});

// Sample reviews for demonstration
const reviews = [
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

// Public pages
app.get('/', (req, res) => {
  res.render('index', { req });
});
app.get('/about', (req, res) => res.render('about'));
app.get('/services', (req, res) => res.render('services'));
app.get('/reviews', async (req, res) => {
  try {
    const dbReviews = await Review.find().sort({ createdAt: -1 });
    const allReviews = [...starterReviews, ...dbReviews]; // combine starter + fetched reviews
    res.render('reviews', { reviews: allReviews, req });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.render('reviews', { reviews: starterReviews, req, error: 'Unable to load user reviews. Showing starter reviews only.' });
  }
});


// Reviews submission
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
    res.redirect('/?contact=success'); // 👈 redirect to home page on success
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
  const { username, password, confirmPassword } = req.body;
  try {
    if (password !== confirmPassword) {
      return res.render('register', { req, error: 'Passwords do not match.' });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('register', { req, error: 'Username already taken.' });
    }
    const hash = await bcrypt.hash(password, 12);
    const user = new User({ username, password: hash });
    await user.save();
    req.session.user = user._id; // automatically log user in

    // Send welcome email
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: username, // assuming username is the email address
      subject: 'Welcome to Calibrated Computares!',
      text: `Hi ${username},\n\nThank you for registering at Calibrated Computares! We're excited to have you onboard.\n\nYou can now log in anytime to book consultations or leave reviews.\n\nBest,\nDana Llewellyn`
    });

    console.log(`Welcome email sent to ${username}`);

    res.redirect('/?register=success');
  } catch (err) {
    console.error('Error registering user:', err);
    res.render('register', { req, error: 'An unexpected error occurred. Please try again.' });
  }
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) {
    return res.render('login', { req, error: 'Invalid username or password.' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.render('login', { req, error: 'Invalid username or password.' });
  }
  req.session.user = user._id;
  res.redirect('/');
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
