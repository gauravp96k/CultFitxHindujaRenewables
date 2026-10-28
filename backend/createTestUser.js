require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cultfit-corporate');
    console.log('Connected to MongoDB...');

    const email = 'employee@hindujarenewables.com';
    
    let user = await User.findOne({ email });
    if (user) {
      console.log('Test employee already exists:', user);
      process.exit(0);
    }

    user = await User.create({
      employeeId: 'HREPL1024',
      fullName: 'Rahul Sharma',
      email: email,
      officialEmail: email,
      role: 'Employee',
      department: 'Operations',
      workLocation: 'Mumbai',
      city: 'Mumbai',
      isActive: true
    });

    console.log('Test employee created successfully:', user);
    process.exit(0);
  } catch (err) {
    console.error('Error creating test user:', err);
    process.exit(1);
  }
}

createTestUser();