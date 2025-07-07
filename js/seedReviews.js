require('dotenv').config();
const mongoose = require('mongoose');
const Review = require('../models/Review');

const starterReviews = [
  {
    name: "Jayna Forgie",
    text: "Dana has been a lifesaver when it comes to all my computer issues. She’s patient, professional, and always goes above and beyond.",
    image: "/images/review1.jpg",
    rating: 5
  },
  {
    name: "Sam Reynolds",
    text: "Excellent service and quick turnaround! My website looks amazing, and I couldn’t be happier with the process from start to finish.",
    image: "/images/review2.jpg",
    rating: 5
  },
  {
    name: "Alex Kim",
    text: "Professional, efficient, and incredibly knowledgeable. Dana handled everything seamlessly and delivered exactly what I needed.",
    image: "/images/review3.jpg",
    rating: 5
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Optionally clear existing reviews:
    // await Review.deleteMany({});
    // console.log('Cleared existing reviews.');

    await Review.insertMany(starterReviews);
    console.log('Starter reviews seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding reviews:', error);
    process.exit(1);
  }
}

seed();
