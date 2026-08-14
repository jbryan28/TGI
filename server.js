const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function resolveRequest(url = '/') {
  const pathname = decodeURIComponent(url.split('?')[0]);
  const cleanPath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const requested = path.join(root, cleanPath);
  if (!requested.startsWith(root)) return null;
  if (path.extname(requested)) return requested;
  return path.join(requested, 'index.html');
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 4173;
  http.createServer((request, response) => {
    const file = resolveRequest(request.url);
    if (!file || !fs.existsSync(file)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Not found');
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  }).listen(port, () => console.log(`TGI is running at http://localhost:${port}`));
}

module.exports = { resolveRequest };
