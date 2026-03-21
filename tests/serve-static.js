const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);
const ROOT_DIR = path.resolve(__dirname, '..');

const CONTENT_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function resolveRequestPath(requestUrl) {
    const { pathname } = new URL(requestUrl, `http://${HOST}:${PORT}`);
    const safePath = decodeURIComponent(pathname);
    const relativePath = safePath === '/' ? '/index.html' : safePath;
    const absolutePath = path.resolve(ROOT_DIR, `.${relativePath}`);

    if (!absolutePath.startsWith(ROOT_DIR)) {
        return null;
    }

    return absolutePath;
}

function sendFile(response, filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[extension] || 'application/octet-stream';
    response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentType,
    });
    fs.createReadStream(filePath).pipe(response);
}

function sendNotFound(response) {
    response.writeHead(404, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
    });
    response.end('Not Found');
}

const server = http.createServer((request, response) => {
    const filePath = resolveRequestPath(request.url);
    if (!filePath) {
        sendNotFound(response);
        return;
    }

    fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
            sendNotFound(response);
            return;
        }
        sendFile(response, filePath);
    });
});

function shutdown() {
    server.close(() => {
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, HOST, () => {
    console.log(`static server ready at http://${HOST}:${PORT}`);
});
