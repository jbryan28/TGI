const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveRequest } = require('../server');

test('resource route resolves to the page', () => {
  const file = resolveRequest('/resources/weekly-capital-review');
  assert.equal(path.relative(path.join(__dirname, '..'), file), 'resources/weekly-capital-review/index.html');
  assert.equal(fs.existsSync(file), true);
});

test('Resources navigation links to the review from the home page', () => {
  const home = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.match(home, /href="\/resources\/weekly-capital-review"/);
});

test('review page exposes a downloadable template', () => {
  const page = fs.readFileSync(path.join(__dirname, '../resources/weekly-capital-review/index.html'), 'utf8');
  assert.match(page, /href="\/resources\/weekly-capital-review\/weekly-capital-review\.txt" download/);
});
