// One-time export of public demo content already present in the Angular prototype.
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../frontend/src/app/core/services/local-db.service.ts'), 'utf8');
function extract(name) {
  const method = source.indexOf(`private ${name}(`);
  if (method < 0) throw new Error(`Missing ${name}`);
  const start = source.indexOf('    return ', method);
  const end = source.indexOf('\n  }', start);
  if (start < 0 || end < 0) throw new Error(`Could not parse ${name}`);
  return new Function(source.slice(start, end).trim())();
}
const output = {
  articles: extract('getSeedArticles'),
  pages: extract('getSeedPages')
};
fs.writeFileSync(path.join(__dirname, 'src/main/resources/seed.json'), JSON.stringify(output, null, 2) + '\n');
