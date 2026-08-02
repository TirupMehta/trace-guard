import http from 'http';
import zlib from 'zlib';
import { setupHook } from '../src/index';

describe('Integration — CSP Nonce & Gzip/Brotli Stream Interception', () => {
  beforeAll(() => {
    setupHook({ enabled: true, logDetections: false });
  });

  test('preserves CSP nonce in injected script tag', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-EnterpriseNonce42';",
      });
      res.end('<html><body><h1>CSP Protected Page</h1></body></html>');
    });

    await new Promise<void>(resolve => server.listen(3088, () => resolve()));

    const responseText = await new Promise<string>((resolve, reject) => {
      http.get('http://localhost:3088', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
        res.on('error', reject);
      });
    });

    server.close();

    expect(responseText).toContain('<h1>CSP Protected Page</h1>');
    expect(responseText).toContain('script nonce="EnterpriseNonce42"');
  });

  test('decompresses, injects, and re-gzips HTML gzip responses', async () => {
    const rawHtml = '<html><body><h1>Gzip Compressed Content</h1></body></html>';
    const gzippedBuffer = zlib.gzipSync(Buffer.from(rawHtml, 'utf8'));

    const server = http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Encoding': 'gzip',
      });
      res.end(gzippedBuffer);
    });

    await new Promise<void>(resolve => server.listen(3089, () => resolve()));

    const decompressedBody = await new Promise<string>((resolve, reject) => {
      http.get('http://localhost:3089', (res) => {
        expect(res.headers['content-encoding']).toBe('gzip');
        const gunzip = zlib.createGunzip();
        let body = '';
        res.pipe(gunzip);
        gunzip.on('data', chunk => body += chunk.toString('utf8'));
        gunzip.on('end', () => resolve(body));
        gunzip.on('error', reject);
      });
    });

    server.close();

    expect(decompressedBody).toContain('<h1>Gzip Compressed Content</h1>');
    expect(decompressedBody).toContain('__TG_DEFENSE__');
  });

  test('decompresses, injects, and re-brotli compresses HTML br responses', async () => {
    const rawHtml = '<html><body><h1>Brotli Compressed Content</h1></body></html>';
    const brBuffer = zlib.brotliCompressSync(Buffer.from(rawHtml, 'utf8'));

    const server = http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Encoding': 'br',
      });
      res.end(brBuffer);
    });

    await new Promise<void>(resolve => server.listen(3090, () => resolve()));

    const decompressedBody = await new Promise<string>((resolve, reject) => {
      http.get('http://localhost:3090', (res) => {
        expect(res.headers['content-encoding']).toBe('br');
        const brotli = zlib.createBrotliDecompress();
        let body = '';
        res.pipe(brotli);
        brotli.on('data', chunk => body += chunk.toString('utf8'));
        brotli.on('end', () => resolve(body));
        brotli.on('error', reject);
      });
    });

    server.close();

    expect(decompressedBody).toContain('<h1>Brotli Compressed Content</h1>');
    expect(decompressedBody).toContain('__TG_DEFENSE__');
  });
});
