/**
 * Pet Routes  
 * All routes are protected by auth middleware
 * Handles user's pet management operations (CRUD)
 * All operations are scoped to the authenticated user's pets only
 */

const express = require('express');
const {
  getMyPets,
  getMyPetById,
  createPet,
  updateMyPet,
  deleteMyPet,
  addMedicalRecord,
  addVaccination,
  getVaccinationReminders,
  getPetStatistics,
  quickCreatePet
} = require('../controllers/petController');

const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(protect);

// Staff / Admin — quick-create a pet for a walk-in guest (must be before /:id)
router.post('/staff/quick-create', restrictTo('staff', 'admin'), quickCreatePet);  // POST /api/pets/staff/quick-create

// Pet Statistics & Reminders (before parameterized routes)
router.get('/statistics', getPetStatistics);           // GET /api/pets/statistics - Get pet statistics
router.get('/vaccination-reminders', getVaccinationReminders);  // GET /api/pets/vaccination-reminders - Get vaccination reminders

// Main Pet CRUD Routes
router.route('/')
  .get(getMyPets)                                      // GET /api/pets - Get all my pets
  .post(createPet);                                    // POST /api/pets - Create new pet

router.route('/:id')
  .get(getMyPetById)                                   // GET /api/pets/:id - Get specific pet
  .put(updateMyPet)                                    // PUT /api/pets/:id - Update specific pet
  .delete(deleteMyPet);                                // DELETE /api/pets/:id - Delete specific pet

// Pet Health Management Routes
router.route('/:id/medical-records')
  .post(addMedicalRecord);                            // POST /api/pets/:id/medical-records - Add medical record

router.route('/:id/vaccinations')
  .post(addVaccination);                               // POST /api/pets/:id/vaccinations - Add vaccination record

module.exports = router;