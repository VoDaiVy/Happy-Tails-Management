require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
require('../models/Category');
const { connectDB } = require('../config/database');
const Service = require('../models/Service');
const Room = require('../models/Room');

const run = async () => {
  await connectDB();

  const services = await Service.find({ isActive: true })
    .populate('category', 'name')
    .select('name price duration category isActive')
    .sort({ name: 1 })
    .lean();

  const rooms = await Room.find({})
    .select('roomNumber name type serviceType group capacity maxPets isAvailable isActive pricePerNight')
    .sort({ serviceType: 1, roomNumber: 1, name: 1 })
    .lean();

  console.log('=== ACTIVE SERVICES ===');
  console.log('count=', services.length);
  services.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} | cat=${s.category?.name || 'N/A'} | price=${s.price} | duration=${s.duration}`);
  });

  console.log('\n=== ROOMS (ALL) ===');
  console.log('count=', rooms.length);
  rooms.forEach((r, i) => {
    console.log(`${i + 1}. room=${r.roomNumber || 'N/A'} | name=${r.name || 'N/A'} | type=${r.type || 'N/A'} | serviceType=${r.serviceType || 'N/A'} | group=${r.group || 'N/A'} | capacity=${r.capacity ?? r.maxPets ?? 'N/A'} | active=${r.isActive} | available=${r.isAvailable}`);
  });

  const roomSummary = rooms.reduce((acc, r) => {
    const key = (r.serviceType || 'undefined').toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log('\nroomsByServiceType=', JSON.stringify(roomSummary));

  await mongoose.connection.close();
};

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Inspection failed:', err);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  });
