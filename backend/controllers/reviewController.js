const { Review, Order, sequelize }       = require('../models');
const { successResponse, errorResponse } = require('../utils/response');

// POST /api/orders/:id/reviews
exports.addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const orderId = parseInt(req.params.id, 10);

    if (!rating || !Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      return errorResponse(res, 'Rating must be an integer between 1 and 5', 400);
    }

    const order = await Order.findOne({ where: { id: orderId, user_id: req.user.id } });

    if (!order) {
      return errorResponse(res, 'Order not found or access denied', 404);
    }

    if (order.status !== 'COMPLETED') {
      return errorResponse(res, 'You can only review COMPLETED orders', 400);
    }

    const review = await sequelize.transaction(async (t) => {
      return await Review.create({
        order_id: order.id,
        rating:   Number(rating),
        comment:  comment || null,
      }, { transaction: t });
    });

    return successResponse(res, review, 'Review created successfully', 201);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'You have already reviewed this order', 400);
    }
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(e => ({ field: e.path, message: e.message }));
      return errorResponse(res, 'Validation failed', 400, errors);
    }
    next(error);
  }
};

// GET /api/restaurants/:id/reviews
exports.getRestaurantReviews = async (req, res, next) => {
  try {
    const restaurantId = parseInt(req.params.id, 10);

    const reviews = await Review.findAll({
      include: [{
        model:      Order,
        where:      { restaurant_id: restaurantId },
        attributes: ['user_id', 'created_at'],
      }],
      order: [['created_at', 'DESC']],
    });

    const stats = await Review.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Review.id')), 'total_reviews'],
        [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('rating')), 2), 'avg_rating'],
      ],
      include: [{
        model:      Order,
        where:      { restaurant_id: restaurantId },
        attributes: [],
      }],
      raw: true,
    });

    const reviewData = reviews.map(r => ({
      rating:    r.rating,
      comment:   r.comment,
      createdAt: r.created_at || r.createdAt,
      userId:    r.Order?.user_id ?? null,
    }));

    return res.status(200).json({
      status: 'success',
      stats: {
        totalReviews:  parseInt(stats?.total_reviews, 10) || 0,
        averageRating: parseFloat(stats?.avg_rating)      || 0,
      },
      data: reviewData,
    });
  } catch (error) {
    next(error);
  }
};
