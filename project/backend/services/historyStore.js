/**
 * Simple in-memory store for scan history.
 * NOTE: resets on every server restart. Swap for a DB in production.
 */
const crypto = require('crypto');

const MAX_ITEMS = 100;
const items = []; // newest last

function add(entry) {
  const record = {
    id: crypto.randomBytes(8).toString('hex'),
    timestamp: Date.now(),
    ...entry,
  };
  items.push(record);
  while (items.length > MAX_ITEMS) items.shift();
  return record;
}

function list() {
  // return newest first, and strip heavy fields
  return [...items].reverse().map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    description: r.description,
    text: r.text,
    objects: r.objects,
    imageCount: Array.isArray(r.imagePaths) ? r.imagePaths.length : 0,
  }));
}

function get(id) {
  return items.find((r) => r.id === id) || null;
}

module.exports = { add, list, get };
