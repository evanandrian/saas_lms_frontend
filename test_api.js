const http = require('http');
http.get('http://localhost:8080/api/v1/platform/invoices/payments', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
}).on('error', err => console.error(err));
