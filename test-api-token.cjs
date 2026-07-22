const handler = require('./api/firebase-token.js');

async function test() {
  const req = { method: 'GET' };
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('RES STATUS:', this.statusCode, 'DATA:', data);
    },
    setHeader() {}
  };
  await handler.default(req, res);
}

test().catch(console.error);
