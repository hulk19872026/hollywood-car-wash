const historyStore = require('../services/historyStore');

function list(_req, res) {
  res.json({ items: historyStore.list() });
}

function get(req, res) {
  const rec = historyStore.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Not found' });
  const { imagePath: _ignored, ...safe } = rec;
  res.json(safe);
}

module.exports = { list, get };
