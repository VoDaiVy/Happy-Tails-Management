/**
 * Category Model
 * Categories for services (e.g., Grooming, Veterinary, Boarding, etc.)
 */

const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name must be less than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must be less than 500 characters']
  },
  imageUrl: {
    type: String,
    trim: true,
    default: null
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [200, 'Icon URL must be less than 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ isActive: 1 });
// Note: slug index is automatically created by unique: true

// Pre-save hook: auto-generate slug from name
categorySchema.pre('save', function() {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

// Pre-findOneAndUpdate hook: regenerate slug if name is updated
categorySchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  if (update.name) {
    update.slug = slugify(update.name, { lower: true, strict: true });
  }
});

/**
 * Static method: Find all active categories
 * @returns {Query}
 */
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
