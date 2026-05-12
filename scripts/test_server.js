const http = require('http');
const traceGuard = require('../dist/src/hook.js');

traceGuard.setupHook({
  enabled: true,
  mode: 'block',
  threshold: 0.7,
  onDetection: (result) => {
    console.log('\n=======================================');
    console.log('🚨 [TRACE GUARD BOT DETECTED] 🚨');
    console.log('Reason:', result.reason);
    console.log('Score:', result.score);
    console.log('=======================================\n');
  }
});

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Secure Checkout</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f9fafb; display: flex; justify-content: center; padding: 40px; }
          .checkout-container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 500px; }
          h2 { margin-top: 0; color: #111827; }
          .form-group { margin-bottom: 20px; }
          label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; }
          input { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; box-sizing: border-box; }
          button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: 600; cursor: pointer; }
          button:hover { background: #1d4ed8; }
          #success-msg { display: none; margin-top: 20px; padding: 15px; background: #dcfce3; color: #166534; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="checkout-container">
          <h2>Secure Checkout</h2>
          <form id="checkout-form">
            <div class="form-group">
              <label for="fullName">Full Name</label>
              <input type="text" id="fullName" name="fullName" required placeholder="John Doe">
            </div>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" id="email" name="email" required placeholder="john@example.com">
            </div>
            <div class="form-group">
              <label for="cardNumber">Card Number</label>
              <input type="text" id="cardNumber" name="cardNumber" required placeholder="0000 0000 0000 0000">
            </div>
            <button type="submit" id="submit-btn">Complete Purchase</button>
          </form>
          <div id="success-msg">✅ Purchase Completed Successfully!</div>
        </div>
        <script>
          // PRE-FLIGHT TELEPORT TRAP
          const trap = document.createElement('div');
          trap.id = 'tg-teleport-trap';
          trap.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index: 2147483647; opacity: 0;';
          document.body.appendChild(trap);

          let mouseMoveCount = 0;
          const disarmTrap = () => {
            if (trap.parentNode) {
              trap.parentNode.removeChild(trap);
              console.log('TRAP DISARMED BY HUMAN');
            }
          };

          document.addEventListener('mousemove', () => {
            mouseMoveCount++;
            if (mouseMoveCount > 3) disarmTrap();
          }, {passive: true});

          document.addEventListener('touchstart', disarmTrap, {passive: true});

          trap.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('🚨 VLM TELEPORT BLOCKED! Real element was protected.');
            document.body.style.backgroundColor = '#fecaca'; // Red flash for visual proof
          }, {capture: true});

          document.getElementById('checkout-form').addEventListener('submit', (e) => {
            e.preventDefault();
            document.getElementById('success-msg').style.display = 'block';
            document.getElementById('submit-btn').disabled = true;
          });
        </script>
      </body>
      </html>
    `);
  } else if (req.url === '/log') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('AGENT PAYLOAD:', body);
      res.end('ok');
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('Realistic Test Server running at http://localhost:3000');
});
