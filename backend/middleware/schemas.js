// backend/middleware/schemas.js
// Zod schemas for new endpoints only

const { z } = require('zod');

// Reusable primitives
const positiveInt    = z.number({ coerce: true }).int().positive();
const nonEmptyString = (max = 255) => z.string().trim().min(1).max(max);
const emailField     = z.string().trim().email('Must be a valid email address').max(255);
const phoneField     = z.string().trim().min(7).max(20);

// ─── ADDRESSES ───────────────────────────────────────
const addressSchemas = {
  create: z.object({
    street:      nonEmptyString(255),
    city:        nonEmptyString(100),
    postal_code: z.string().trim().max(20).optional(),
    is_default:  z.boolean({ coerce: true }).optional().default(false),
  }),

  update: z.object({
    street:      nonEmptyString(255).optional(),
    city:        nonEmptyString(100).optional(),
    postal_code: z.string().trim().max(20).optional(),
    is_default:  z.boolean({ coerce: true }).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update.' }
  ),
};

// ─── RESTAURANT OWNER MENU ───────────────────────────
const restaurantOwnerSchemas = {
  addMenuItem: z.object({
    category_id:   positiveInt,
    item_name:     nonEmptyString(100),
    description:   z.string().trim().max(500).optional(),
    price:         z.number({ coerce: true }).positive('Price must be greater than 0'),
    is_available:  z.boolean({ coerce: true }).optional().default(true),
  }),

  updateMenuItem: z.object({
    item_name:    nonEmptyString(100).optional(),
    description:  z.string().trim().max(500).optional(),
    price:        z.number({ coerce: true }).positive().optional(),
    is_available: z.boolean({ coerce: true }).optional(),
    category_id:  positiveInt.optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update.' }
  ),
};

// ─── PARTNER APPLICATIONS ────────────────────────────
const partnerSchemas = {
  restaurantApplication: z.object({
    full_name:       nonEmptyString(100),
    email:           emailField,
    phone:           phoneField,
    restaurant_name: nonEmptyString(100),
    address:         nonEmptyString(255),
  }),

  driverApplication: z.object({
    full_name:      nonEmptyString(100),
    email:          emailField,
    phone:          phoneField,
    license_number: nonEmptyString(50),
    vehicle_type:   z.enum(['bicycle', 'scooter', 'car', 'ebike']),
  }),
};

// ─── ORDER STATUS ─────────────────────────────────────
const orderSchemas = {
  updateStatus: z.object({
    status: z.enum([
      'PENDING', 'PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING',
      'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'
    ]),
    notes: z.string().trim().max(500).optional(),
  }),
};

const schemas = {
  address:         addressSchemas,
  restaurantOwner: restaurantOwnerSchemas,
  partner:         partnerSchemas,
  order:           orderSchemas,
};

module.exports = { schemas };
