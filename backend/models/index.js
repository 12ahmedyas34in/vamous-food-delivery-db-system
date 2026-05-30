// backend/models/index.js
//
// Phase 1 — Complete 16-table schema
//
// Tables added in Phase 1 (6 new):
//   addresses, payment_methods, menu_categories,
//   operating_hours, cuisine_types, restaurant_cuisines
//
// Tables carried forward from MVP (10 existing):
//   users, drivers, restaurants, menu_items, orders,
//   order_items, order_status_history, payments, reviews, cart_items
//
// ENUM update: Order.status and OrderStatusHistory.status_name
//   now include PENDING_PAYMENT and PAID states (SRS FR-STATE)
//
// Run after changes:
//   node seed.js  (drops + recreates + seeds everything)

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// ══════════════════════════════════════════════════════════════════════════════
// 1. USERS
// ══════════════════════════════════════════════════════════════════════════════
const User = sequelize.define('User', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email:         { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  full_name:     { type: DataTypes.STRING(100), allowNull: false },
  phone:         { type: DataTypes.STRING(20),  allowNull: false },
  role: {
    type: DataTypes.ENUM('customer', 'restaurant_owner', 'driver', 'admin'),
    allowNull: false,
    defaultValue: 'customer',
  },
  deleted_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName:  'users',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. DRIVERS (ISA specialization of users)
// ══════════════════════════════════════════════════════════════════════════════
const Driver = sequelize.define('Driver', {
  user_id: {
    type:       DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'users', key: 'id' },
  },
  vehicle_type:         { type: DataTypes.STRING(50),    allowNull: true },
  license_number:       { type: DataTypes.STRING(50),    allowNull: false },
  is_available:         { type: DataTypes.BOOLEAN,       defaultValue: true },
  current_lat:          { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  current_lng:          { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  last_location_update: { type: DataTypes.DATE,          allowNull: true },
}, {
  tableName:  'drivers',
  timestamps: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. ADDRESSES ← NEW in Phase 1
// ══════════════════════════════════════════════════════════════════════════════
const Address = sequelize.define('Address', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'users', key: 'id' },   // explicit DB-level FK
  },
  street:      { type: DataTypes.STRING(255),    allowNull: false },
  city:        { type: DataTypes.STRING(100),    allowNull: false },
  postal_code: { type: DataTypes.STRING(20),     allowNull: true },
  latitude:    { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude:   { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  is_default:  { type: DataTypes.BOOLEAN,        defaultValue: false },
}, {
  tableName:  'addresses',
  timestamps: false,
  indexes: [
    { fields: ['user_id'] },   // speeds up WHERE user_id = ? lookups
  ],
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. CUISINE_TYPES ← NEW in Phase 1
// ══════════════════════════════════════════════════════════════════════════════
const CuisineType = sequelize.define('CuisineType', {
  id:        { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
  type_name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
}, {
  tableName:  'cuisine_types',
  timestamps: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. RESTAURANTS
// ══════════════════════════════════════════════════════════════════════════════
const Restaurant = sequelize.define('Restaurant', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  owner_id: { type: DataTypes.INTEGER, allowNull: false },
  name:         { type: DataTypes.STRING(100), allowNull: false },
  description:  { type: DataTypes.TEXT,        allowNull: true },
  image_url:    { type: DataTypes.STRING(255),  allowNull: true },  // Phase 2: Cloudinary
  address:      { type: DataTypes.STRING(255),  allowNull: false },
  phone:        { type: DataTypes.STRING(20),   allowNull: false },
  delivery_fee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  estimated_time: { type: DataTypes.INTEGER,    allowNull: true },  // minutes
  is_active:    { type: DataTypes.BOOLEAN,      defaultValue: true },
  deleted_at:   { type: DataTypes.DATE,         allowNull: true },
}, {
  tableName:  'restaurants',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. RESTAURANT_CUISINES (M:N junction) ← NEW in Phase 1
// ══════════════════════════════════════════════════════════════════════════════
const RestaurantCuisine = sequelize.define('RestaurantCuisine', {
  restaurant_id: {
    type:       DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'restaurants', key: 'id' },
  },
  cuisine_id: {
    type:       DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'cuisine_types', key: 'id' },
  },
}, {
  tableName:  'restaurant_cuisines',
  timestamps: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. OPERATING_HOURS (weak entity — identified by restaurants) ← NEW Phase 1
// ══════════════════════════════════════════════════════════════════════════════
const OperatingHour = sequelize.define('OperatingHour', {
  restaurant_id: {
    type:       DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'restaurants', key: 'id' },
  },
  day_of_week: {
    type: DataTypes.ENUM(
      'Monday', 'Tuesday', 'Wednesday', 'Thursday',
      'Friday', 'Saturday', 'Sunday'
    ),
    primaryKey: true,
    allowNull:  false,
  },
  open_time:  { type: DataTypes.TIME, allowNull: false },
  close_time: { type: DataTypes.TIME, allowNull: false },
}, {
  tableName:  'operating_hours',
  timestamps: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. MENU_CATEGORIES ← NEW in Phase 1
// ══════════════════════════════════════════════════════════════════════════════
const MenuCategory = sequelize.define('MenuCategory', {
  id:            { type: DataTypes.INTEGER,   primaryKey: true, autoIncrement: true },
  restaurant_id: { type: DataTypes.INTEGER,   allowNull: false },
  category_name: { type: DataTypes.STRING(50), allowNull: false },
  display_order: { type: DataTypes.INTEGER,   defaultValue: 0 },
}, {
  tableName:  'menu_categories',
  timestamps: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. MENU_ITEMS
// ══════════════════════════════════════════════════════════════════════════════
const MenuItem = sequelize.define('MenuItem', {
  id:            { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
  restaurant_id: { type: DataTypes.INTEGER,     allowNull: false },
  category_id:   { type: DataTypes.INTEGER,     allowNull: false },  // NOT NULL per SRS 3NF design
  item_name:     { type: DataTypes.STRING(100), allowNull: false },
  description:   { type: DataTypes.TEXT,        allowNull: true },
  price:         { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stock_quantity: { type: DataTypes.INTEGER,    defaultValue: 999 },
  is_available:  { type: DataTypes.BOOLEAN,     defaultValue: true },
  image_url:     { type: DataTypes.STRING(255), allowNull: true },   // Phase 2: Cloudinary
  deleted_at:    { type: DataTypes.DATE,        allowNull: true },
}, {
  tableName:  'menu_items',
  timestamps: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. PAYMENT_METHODS ← NEW in Phase 1 (replaces free-text payment_method field)
// ══════════════════════════════════════════════════════════════════════════════
const PaymentMethod = sequelize.define('PaymentMethod', {
  id:          { type: DataTypes.INTEGER,    primaryKey: true, autoIncrement: true },
  method_name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
}, {
  tableName:  'payment_methods',
  timestamps: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. ORDERS (central fact table)
//
// ENUM updated for Phase 1:
//   Added PENDING_PAYMENT and PAID states per SRS FR-STATE and Decision Q2.
//   order_status now reflects the full lifecycle including payment confirmation.
// ══════════════════════════════════════════════════════════════════════════════
const Order = sequelize.define('Order', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:       { type: DataTypes.INTEGER, allowNull: false },
  restaurant_id: { type: DataTypes.INTEGER, allowNull: false },
  // Phase 1: address_id FK replaces the free-text delivery_address field
  address_id:    { type: DataTypes.INTEGER, allowNull: false },
  driver_id:     { type: DataTypes.INTEGER, allowNull: true },
  // Phase 1: full lifecycle ENUM including payment states
  status: {
    type: DataTypes.ENUM(
      'PENDING',           // order created, payment method selected
      'PENDING_PAYMENT',   // awaiting manual bank transfer / Tele Birr confirmation
      'PAID',              // payment confirmed (COD = automatic, transfer = admin confirms)
      'CONFIRMED',         // restaurant acknowledged the order
      'PREPARING',         // kitchen is preparing
      'READY',             // ready for driver pickup
      'OUT_FOR_DELIVERY',  // driver collected the order
      'COMPLETED',         // delivered — enables review
      'CANCELLED'          // cancelled from any non-terminal state
    ),
    allowNull:    false,
    defaultValue: 'PENDING',
  },
  subtotal:         { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  tax:              { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  delivery_fee:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount_amount:  { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  // Materialized total — documented 3NF exception for read performance
  total_amount:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  special_instructions: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName:  'orders',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. ORDER_ITEMS (weak entity — identified by orders)
// ══════════════════════════════════════════════════════════════════════════════
const OrderItem = sequelize.define('OrderItem', {
  order_id: {
    type:       DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'orders', key: 'id' },
  },
  line_no: {
    type:       DataTypes.INTEGER,
    primaryKey: true,  // discriminator — unique within an order
  },
  menu_item_id:         { type: DataTypes.INTEGER,      allowNull: false },
  quantity:             { type: DataTypes.INTEGER,      allowNull: false },
  // Price snapshot at order creation — never changes even if menu price changes later
  unit_price:           { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  special_instructions: { type: DataTypes.TEXT,         allowNull: true },
}, {
  tableName:  'order_items',
  timestamps: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 13. ORDER_STATUS_HISTORY (weak entity — identified by orders)
//
// ENUM updated: same values as Order.status to maintain consistency.
// ══════════════════════════════════════════════════════════════════════════════
const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  order_id: {
    type:       DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'orders', key: 'id' },
  },
  updated_at: {
    type:         DataTypes.DATE,
    primaryKey:   true,  // discriminator — timestamp of change
    defaultValue: DataTypes.NOW,
  },
  status_name: {
    type: DataTypes.ENUM(
      'PENDING', 'PENDING_PAYMENT', 'PAID', 'CONFIRMED',
      'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'
    ),
    allowNull: false,
  },
  actor_user_id: { type: DataTypes.INTEGER, allowNull: false },
  notes:         { type: DataTypes.TEXT,    allowNull: true },
}, {
  tableName:  'order_status_history',
  timestamps: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 14. PAYMENTS (1:1 with orders)
//
// Phase 1: payment_method_id now FK to payment_methods table.
//   Replaces the old free-text payment_method STRING field.
// ══════════════════════════════════════════════════════════════════════════════
const Payment = sequelize.define('Payment', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    unique:    true,  // enforces 1:1 with orders
  },
  payment_method_id: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: 'payment_methods', key: 'id' },  // explicit DB-level FK
  },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    allowNull:    false,
    defaultValue: 'pending',
  },
  transaction_id: { type: DataTypes.STRING(100), allowNull: true },
  paid_at:        { type: DataTypes.DATE,        allowNull: true },
}, {
  tableName:  'payments',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 15. REVIEWS (0..1 with orders — one review per order)
// ══════════════════════════════════════════════════════════════════════════════
const Review = sequelize.define('Review', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    unique:    true,  // DB-level: one review per order
  },
  rating: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    validate:  { min: 1, max: 5 },
  },
  comment: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName:  'reviews',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  false,
});

// ══════════════════════════════════════════════════════════════════════════════
// 16. CART_ITEMS (enterprise upgrade — server-side cart)
// ══════════════════════════════════════════════════════════════════════════════
const CartItem = sequelize.define('CartItem', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:      { type: DataTypes.INTEGER, allowNull: false },
  menu_item_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, {
  tableName:  'cart_items',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  'updated_at',
  indexes: [
    // Composite unique index — prevents duplicate cart rows for same item
    { unique: true, fields: ['user_id', 'menu_item_id'] },
  ],
});

// ══════════════════════════════════════════════════════════════════════════════
// ASSOCIATIONS
// Follows the 7 reduction rules from the Phase 1 DB Architecture document.
// ══════════════════════════════════════════════════════════════════════════════

// ── users ─────────────────────────────────────────────────────────────────────
User.hasOne(Driver,   { foreignKey: 'user_id', onDelete: 'CASCADE' });
Driver.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Address,  { foreignKey: 'user_id' });
Address.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Order,    { foreignKey: 'user_id' });
Order.belongsTo(User,  { foreignKey: 'user_id' });

User.hasMany(Restaurant,      { foreignKey: 'owner_id', as: 'OwnedRestaurants' });
Restaurant.belongsTo(User,    { foreignKey: 'owner_id', as: 'Owner' });

User.hasMany(OrderStatusHistory,         { foreignKey: 'actor_user_id' });
OrderStatusHistory.belongsTo(User,       { foreignKey: 'actor_user_id', as: 'Actor' });

User.hasMany(CartItem,   { foreignKey: 'user_id' });
CartItem.belongsTo(User, { foreignKey: 'user_id' });

// ── restaurants ───────────────────────────────────────────────────────────────
Restaurant.hasMany(MenuCategory,    { foreignKey: 'restaurant_id' });
MenuCategory.belongsTo(Restaurant,  { foreignKey: 'restaurant_id' });

Restaurant.hasMany(MenuItem,    { foreignKey: 'restaurant_id' });
MenuItem.belongsTo(Restaurant,  { foreignKey: 'restaurant_id' });

Restaurant.hasMany(OperatingHour,    { foreignKey: 'restaurant_id' });
OperatingHour.belongsTo(Restaurant,  { foreignKey: 'restaurant_id' });

// M:N — restaurants ↔ cuisine_types via restaurant_cuisines junction
Restaurant.belongsToMany(CuisineType, {
  through:     RestaurantCuisine,
  foreignKey:  'restaurant_id',
  as:          'Cuisines',
});
CuisineType.belongsToMany(Restaurant, {
  through:     RestaurantCuisine,
  foreignKey:  'cuisine_id',
  as:          'Restaurants',
});

Restaurant.hasMany(Order,    { foreignKey: 'restaurant_id' });
Order.belongsTo(Restaurant,  { foreignKey: 'restaurant_id' });

// ── menu_categories ───────────────────────────────────────────────────────────
MenuCategory.hasMany(MenuItem,    { foreignKey: 'category_id' });
MenuItem.belongsTo(MenuCategory,  { foreignKey: 'category_id', as: 'Category' });

// ── orders ────────────────────────────────────────────────────────────────────
Order.belongsTo(Address,  { foreignKey: 'address_id', as: 'DeliveryAddress' });
Address.hasMany(Order,    { foreignKey: 'address_id' });

Order.belongsTo(Driver,   { foreignKey: 'driver_id', as: 'AssignedDriver' });
Driver.hasMany(Order,     { foreignKey: 'driver_id' });

Order.hasMany(OrderItem,      { foreignKey: 'order_id' });
OrderItem.belongsTo(Order,    { foreignKey: 'order_id' });

OrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id' });
MenuItem.hasMany(OrderItem,   { foreignKey: 'menu_item_id' });

Order.hasMany(OrderStatusHistory,      { foreignKey: 'order_id' });
OrderStatusHistory.belongsTo(Order,    { foreignKey: 'order_id' });

Order.hasOne(Payment,      { foreignKey: 'order_id' });
Payment.belongsTo(Order,   { foreignKey: 'order_id' });

Order.hasOne(Review,       { foreignKey: 'order_id' });
Review.belongsTo(Order,    { foreignKey: 'order_id' });

// ── payment_methods ───────────────────────────────────────────────────────────
PaymentMethod.hasMany(Payment,    { foreignKey: 'payment_method_id' });
Payment.belongsTo(PaymentMethod,  { foreignKey: 'payment_method_id', as: 'Method' });

// ── cart_items ────────────────────────────────────────────────────────────────
CartItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id' });
MenuItem.hasMany(CartItem,   { foreignKey: 'menu_item_id' });

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════
module.exports = {
  sequelize,
  User, Driver, Address,
  CuisineType, Restaurant, RestaurantCuisine, OperatingHour,
  MenuCategory, MenuItem,
  PaymentMethod,
  Order, OrderItem, OrderStatusHistory,
  Payment, Review, CartItem,
};
