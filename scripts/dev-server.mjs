import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argumentValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const host = argumentValue('--host', '0.0.0.0');
const port = Number(argumentValue('--port', '4173'));
const mime = {
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'
};

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url || '/', 'http://local').pathname);
  const relativePath = requestPath.endsWith('/') ? `${requestPath}index.html` : requestPath;
  const target = path.resolve(root, `.${relativePath}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(target, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, {'content-type':'text/plain; charset=utf-8'}).end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    response.writeHead(200, {'content-type':mime[path.extname(target).toLowerCase()] || 'application/octet-stream','cache-control':'no-store'});
    response.end(content);
  });
});

server.listen(port, host, () => console.log(`Static preview ready on ${host}:${port}`));
