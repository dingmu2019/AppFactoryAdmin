# @adminsys/sdk

Official Node.js/TypeScript SDK for AdminSys SaaS Factory.

## Installation

```bash
npm install @adminsys/sdk
```

## Usage

```typescript
import { AdminSysClient } from '@adminsys/sdk';

const client = new AdminSysClient({
  baseUrl: 'https://api.adminsys.com/api/v1',
  appKey: 'YOUR_APP_KEY',
  appSecret: 'YOUR_APP_SECRET'
});

// Example: Login
async function login() {
  try {
    const res = await client.post('/auth/login', {
      email: 'user@example.com',
      code: '123456'
    });
    console.log(res);
  } catch (error) {
    console.error(error);
  }
}
```

## Features

- Automatic HMAC-SHA256 Request Signing
- TypeScript Types
- Axios based
