const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
  '.mov':  'video/quicktime',
  '.mp3':  'audio/mpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  let filePath = path.join(ROOT, decodeURIComponent(url.parse(req.url).pathname));
  if (filePath === path.join(ROOT, '/') || filePath === ROOT) {
    filePath = path.join(ROOT, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File tidak ditemukan: ' + filePath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('');
  console.log('✅ Server galeri nikah berjalan!');
  console.log('');
  console.log('Buka di browser PC:  http://localhost:' + PORT);
  console.log('');
  console.log('Untuk akses dari HP (pastikan HP & Laptop 1 WiFi):');
  console.log('  http://<IP-LAPTOP-ANDA>:' + PORT);
  console.log('');
  console.log('Tekan Ctrl+C untuk menghentikan server.');
});
