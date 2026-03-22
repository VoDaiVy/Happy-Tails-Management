require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const Service = require('../models/Service');

const allowedNames = [
  'Bath & Dry',
  'Ear & Eye Cleaning',
  'Nail Trimming',
  'Dental Cleaning',
  'Styling & Cutting',
  'Creative Dye',
  'Standard Room',
  'VIP Penthouse',
];

const run = async () => {
  await connectDB();

  const beforeActive = await Service.countDocuments({ isActive: true });
  const toDeleteDocs = await Service.find({ name: { $nin: allowedNames } })
    .select('name')
    .lean();

  const deletedResult = await Service.deleteMany({ name: { $nin: allowedNames } });

  const afterActive = await Service.countDocuments({ isActive: true });
  const remaining = await Service.find({ isActive: true })
    .select('name price')
    .sort({ name: 1 })
    .lean();

  const deletedNames = [...new Set(toDeleteDocs.map((doc) => doc.name))];

  console.log('Active before:', beforeActive);
  console.log('Deleted docs:', deletedResult.deletedCount);
  console.log('Deleted unique names:', deletedNames.length);
  if (deletedNames.length) {
    console.log('Deleted names:', deletedNames.join(' | '));
  }
  console.log('Active after:', afterActive);
  console.log('Remaining active services:');
  remaining.forEach((service, idx) => {
    console.log(`${idx + 1}. ${service.name} | ${service.price}`);
  });

  await mongoose.connection.close();
};

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Prune services failed:', error);
    try {
      await mongoose.connection.close();
    } catch (_) {
      // ignore close errors
    }
    process.exit(1);
  });
