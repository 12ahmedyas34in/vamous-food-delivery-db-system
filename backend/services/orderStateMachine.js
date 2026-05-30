// backend/services/orderStateMachine.js

const TRANSITIONS = {
  PENDING:          ['PENDING_PAYMENT', 'PAID', 'CANCELLED'],
  PENDING_PAYMENT:  ['PAID', 'CANCELLED'],
  PAID:             ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PREPARING', 'CANCELLED'],
  PREPARING:        ['READY', 'CANCELLED'],
  READY:            ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED:        [],
  CANCELLED:        [],
};

/**
 * Check whether a status transition is valid.
 */
const canTransition = (current, next) => {
  return (TRANSITIONS[current] ?? []).includes(next);
};

/**
 * Get all valid next statuses from a given current status.
 */
const getValidTransitions = (current) => {
  return TRANSITIONS[current] ?? [];
};

/**
 * Check whether a status is terminal (no further transitions allowed).
 */
const isTerminal = (status) => {
  return TRANSITIONS[status]?.length === 0;
};

module.exports = { canTransition, getValidTransitions, isTerminal, TRANSITIONS };
