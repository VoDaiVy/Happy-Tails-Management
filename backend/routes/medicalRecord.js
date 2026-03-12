/**
 * Medical Record Routes
 * Staff management of pet health records; customers can view their own pets' records
 */

const express = require('express');
const {
  createMedicalRecord,
  updateMedicalRecord,
  getAllMedicalRecords,
  getMyPetsRecords,
  getMedicalRecordById,
  deleteMedicalRecord,
  updateStage
} = require('../controllers/medicalRecordController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Customer — view records for their own pets
router.get('/my-pets', restrictTo('customer'), getMyPetsRecords);           // GET /api/medical-records/my-pets

// Staff / Admin — full management
router.post('/', restrictTo('staff', 'admin'), createMedicalRecord);        // POST /api/medical-records
router.get('/', restrictTo('staff', 'admin'), getAllMedicalRecords);         // GET  /api/medical-records

// Single record — customer can view own, staff/admin can view all
router.get('/:id', getMedicalRecordById);                                        // GET    /api/medical-records/:id
router.put('/:id', restrictTo('staff', 'admin'), updateMedicalRecord);           // PUT    /api/medical-records/:id
router.patch('/:id/stage', restrictTo('staff', 'admin'), updateStage);           // PATCH  /api/medical-records/:id/stage
router.delete('/:id', restrictTo('staff', 'admin'), deleteMedicalRecord);        // DELETE /api/medical-records/:id

module.exports = router;
