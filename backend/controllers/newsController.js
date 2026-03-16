/**
 * News Controller
 * Handles news/blog management operations
 */

const News = require("../models/News");
const { catchAsync } = require("../utils/catchAsync");
const { AppError } = require("../utils/AppError");

/**
 * Get all news (published only for public)
 * @route GET /api/news
 * @access Public
 */
exports.getAllNews = catchAsync(async (req, res, next) => {
  const { category, tag, search } = req.query;

  const filter = {};

  // Only show published news to non-staff users
  if (!req.user || (req.user.role !== "staff" && req.user.role !== "admin")) {
    filter.isPublished = true;
  }

  if (category) filter.category = category;
  if (tag) filter.tags = tag;

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
      { excerpt: { $regex: search, $options: "i" } },
    ];
  }

  const news = await News.find(filter)
    .populate("author", "name email")
    .sort("-publishedAt -createdAt")
    .limit(50);

  res.status(200).json({
    status: "success",
    results: news.length,
    data: { news },
  });
});

/**
 * Get news by slug
 * @route GET /api/news/:slug
 * @access Public
 */
exports.getNewsBySlug = catchAsync(async (req, res, next) => {
  const news = await News.findOne({ slug: req.params.slug }).populate(
    "author",
    "name email",
  );

  if (!news) {
    return next(new AppError("News not found", 404, "NEWS_NOT_FOUND"));
  }

  // Increment views
  news.views += 1;
  await news.save();

  res.status(200).json({
    status: "success",
    data: { news },
  });
});

/**
 * Create news
 * @route POST /api/news
 * @access Private (Staff, Admin)
 */
exports.createNews = catchAsync(async (req, res, next) => {
  const {
    title,
    content,
    excerpt,
    coverImage,
    images,
    category,
    tags,
    isPublished,
  } = req.body;

  const news = await News.create({
    title,
    content,
    excerpt,
    coverImage,
    images,
    category,
    tags,
    isPublished,
    publishedAt: isPublished ? Date.now() : null,
    author: req.user.id,
  });

  res.status(201).json({
    status: "success",
    message: "News created successfully",
    data: { news },
  });
});

/**
 * Update news
 * @route PUT /api/news/:id
 * @access Private (Staff, Admin)
 */
exports.updateNews = catchAsync(async (req, res, next) => {
  const {
    title,
    content,
    excerpt,
    coverImage,
    images,
    category,
    tags,
    isPublished,
  } = req.body;

  const news = await News.findById(req.params.id);
  if (!news) {
    return next(new AppError("News not found", 404, "NEWS_NOT_FOUND"));
  }

  // Update fields
  if (title) news.title = title;
  if (content) news.content = content;
  if (excerpt !== undefined) news.excerpt = excerpt;
  if (coverImage !== undefined) news.coverImage = coverImage;
  if (images !== undefined) news.images = images;
  if (category) news.category = category;
  if (tags !== undefined) news.tags = tags;

  // Handle publishing
  if (isPublished !== undefined) {
    const wasPublished = news.isPublished;
    news.isPublished = isPublished;

    if (isPublished && !wasPublished) {
      news.publishedAt = Date.now();
    }
  }

  news.updatedBy = req.user.id;
  await news.save();

  res.status(200).json({
    status: "success",
    message: "News updated successfully",
    data: { news },
  });
});

/**
 * Delete news
 * @route DELETE /api/news/:id
 * @access Private (Admin)
 */
exports.deleteNews = catchAsync(async (req, res, next) => {
  const news = await News.findByIdAndDelete(req.params.id);

  if (!news) {
    return next(new AppError("News not found", 404, "NEWS_NOT_FOUND"));
  }

  res.status(200).json({
    status: "success",
    message: "News deleted successfully",
    data: null,
  });
});
