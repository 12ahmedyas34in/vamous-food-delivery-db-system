const { Restaurant, MenuItem, CuisineType } = require('../models');
const { Op }                                = require('sequelize');
const { successResponse, errorResponse }    = require('../utils/response');

// Reusable include — keeps both getRestaurants and getRestaurantById in sync
const CUISINE_INCLUDE = {
  model:   CuisineType,
  as:      'Cuisines',
  attributes: ['id', 'type_name'],
  through: { attributes: [] }, // hide junction table fields
};

// GET /api/restaurants
exports.getRestaurants = async (req, res, next) => {
  try {
    const { name, cuisine } = req.query;
    const limit  = Math.min(parseInt(req.query.limit)  || 10, 50);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);

    const whereClause    = { is_active: true };
    const andConditions  = [];

    if (name)    andConditions.push({ name: { [Op.like]: `%${name}%` } });
    if (cuisine) andConditions.push({ name: { [Op.like]: `%${cuisine}%` } });
    if (andConditions.length > 0) whereClause[Op.and] = andConditions;

    const { count, rows } = await Restaurant.findAndCountAll({
      where:   whereClause,
      include: [CUISINE_INCLUDE],
      limit,
      offset,
    });

    return res.status(200).json({
      status:     'success',
      total:      count,
      page:       Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit),
      results:    rows.length,
      data:       rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/restaurants/:id
exports.getRestaurantById = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const restaurant = await Restaurant.findOne({
      where:   { id: req.params.id, is_active: true },
      include: [CUISINE_INCLUDE],
    });
    if (!restaurant) return errorResponse(res, 'Restaurant not found or inactive', 404);

    return successResponse(res, restaurant, 'Restaurant retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/restaurants/:id/menu
exports.getRestaurantMenu = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const restaurant = await Restaurant.findByPk(req.params.id);
    if (!restaurant || !restaurant.is_active) {
      return errorResponse(res, 'Restaurant not found or inactive', 404);
    }

    const menu = await MenuItem.findAll({
      where: { restaurant_id: req.params.id, is_available: true },
    });

    // DTO: maps item_name → name so the existing frontend doesn't break
    const menuData = menu.map(item => ({
      id:           item.id,
      name:         item.item_name,
      description:  item.description,
      price:        item.price,
      is_available: item.is_available,
      category_id:  item.category_id,
      image_url:    item.image_url,
    }));

    return successResponse(res, menuData, 'Menu retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/menu-items/:id
exports.getMenuItemById = async (req, res, next) => {
  try {
    if (isNaN(req.params.id)) return errorResponse(res, 'Invalid ID format', 400);

    const menuItem = await MenuItem.findOne({ where: { id: req.params.id, is_available: true } });
    if (!menuItem) return errorResponse(res, 'Menu item not found or unavailable', 404);

    // DTO: maps item_name → name for frontend compatibility
    const itemData = {
      id:           menuItem.id,
      name:         menuItem.item_name,
      description:  menuItem.description,
      price:        menuItem.price,
      is_available: menuItem.is_available,
      category_id:  menuItem.category_id,
      image_url:    menuItem.image_url,
    };

    return successResponse(res, itemData, 'Menu item retrieved successfully');
  } catch (error) {
    next(error);
  }
};
