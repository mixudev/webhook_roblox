import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import checkRobloxHandler from './api/check-roblox.js';
import testWebhookHandler from './api/test-webhook.js';
import manageUsersHandler from './api/manage-users.js';
import historyHandler from './api/history.js';
import resetStatusHandler from './api/reset-status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser to load env variables for local development
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex === -1) return;

      const key = trimmed.substring(0, delimiterIndex).trim();
      let value = trimmed.substring(delimiterIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }

      process.env[key] = value;
    });
    console.log('Environment variables loaded from .env file.');
  }
} catch (err) {
  console.warn('Could not read .env file. Using system environment variables.', err.message);
}

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // CORS Headers for easy development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse POST body before proceeding
  let bodyData = '';
  req.on('data', chunk => {
    bodyData += chunk.toString();
  });

  req.on('end', async () => {
    // Attach parsed body
    req.body = {};
    if (bodyData) {
      try {
        req.body = JSON.parse(bodyData);
      } catch (e) {
        // Simple URL-encoded parser fallback if needed
        try {
          const params = new URLSearchParams(bodyData);
          req.body = Object.fromEntries(params.entries());
        } catch (err) {
          req.body = bodyData;
        }
      }
    }

    // Serve Dashboard (public/index.html)
    if (req.url === '/' || req.url === '/index.html' || req.url === '/settings' || req.url === '/history') {
      try {
        // Serve index.html as the Single Page Application router
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        const html = fs.readFileSync(htmlPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading dashboard: ' + err.message);
      }
      return;
    }

    // Serve static files if requested (e.g. css/style.css, js/app.js)
    if (req.url.startsWith('/css/') || req.url.startsWith('/js/')) {
      try {
        const filePath = path.join(__dirname, 'public', req.url);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath);
          const ext = path.extname(filePath);
          const contentType = ext === '.css' ? 'text/css' : 'application/javascript';
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
          return;
        }
      } catch (err) {
        console.error('Static file error:', err);
      }
    }

    // Helper function to inject Vercel Serverless helpers
    const setupHelpers = (res) => {
      res.status = function (statusCode) {
        this.statusCode = statusCode;
        return this;
      };

      res.json = function (data) {
        this.writeHead(this.statusCode || 200, { 'Content-Type': 'application/json' });
        this.end(JSON.stringify(data));
        return this;
      };
    };

    // Route: /api/check-roblox
    if (req.url.startsWith('/api/check-roblox')) {
      setupHelpers(res);
      try {
        await checkRobloxHandler(req, res);
      } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }
      return;
    }

    // Route: /api/test-webhook
    if (req.url.startsWith('/api/test-webhook')) {
      setupHelpers(res);
      try {
        await testWebhookHandler(req, res);
      } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }
      return;
    }

    // Route: /api/manage-users
    if (req.url.startsWith('/api/manage-users')) {
      setupHelpers(res);
      try {
        await manageUsersHandler(req, res);
      } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }
      return;
    }

    // Route: /api/history
    if (req.url.startsWith('/api/history')) {
      setupHelpers(res);
      try {
        await historyHandler(req, res);
      } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }
      return;
    }

    // Route: /api/reset-status
    if (req.url.startsWith('/api/reset-status')) {
      setupHelpers(res);
      try {
        await resetStatusHandler(req, res);
      } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }
      return;
    }

    // 404 Not Found
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Local Server is running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to access the dashboard.\n`);
});
