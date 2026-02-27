# @mongolian-payment/golomt

Golomt Bank ecommerce payment SDK for Node.js. Create invoices, inquire transaction status, and pay by token with automatic HMAC-SHA256 checksum generation.

## Installation

```bash
npm install @mongolian-payment/golomt
```

## Quick Start

```typescript
import { GolomtClient } from "@mongolian-payment/golomt";

const client = new GolomtClient({
  endpoint: "https://ecommerce.golomtbank.com",
  secret: "your-hmac-secret",
  bearerToken: "your-bearer-token",
});

// Create an invoice
const invoice = await client.createInvoice({
  amount: 50000,
  transactionId: "order-12345",
  returnType: "POST",
  callback: "https://yoursite.com/payment/callback",
  getToken: false,
  socialDeeplink: false,
});

// Get payment URL to redirect the user
const paymentUrl = client.getPaymentUrl(invoice.invoice);
// => "https://ecommerce.golomtbank.com/payment/MN/..."

// Check transaction status
const status = await client.inquiry("order-12345");

// Pay with a saved token
const result = await client.payByToken(50000, "saved-token", "order-67890");
```

## Configuration

### Direct

```typescript
const client = new GolomtClient({
  endpoint: "https://ecommerce.golomtbank.com",
  secret: "your-hmac-secret",
  bearerToken: "your-bearer-token",
});
```

### From Environment Variables

```typescript
import { loadConfigFromEnv, GolomtClient } from "@mongolian-payment/golomt";

// Reads GOLOMT_ENDPOINT, GOLOMT_SECRET, GOLOMT_BEARER_TOKEN
const client = new GolomtClient(loadConfigFromEnv());
```

## API

### `createInvoice(input)`

Create a payment invoice. The HMAC checksum is computed automatically.

| Field           | Type        | Description                          |
| --------------- | ----------- | ------------------------------------ |
| amount          | `number`    | Payment amount                       |
| transactionId   | `string`    | Unique transaction identifier        |
| returnType      | `ReturnType`| `"POST"`, `"GET"`, or `"MOBILE"`     |
| callback        | `string`    | Callback URL for payment result      |
| getToken        | `boolean`   | Generate a reusable payment token    |
| socialDeeplink  | `boolean`   | Generate a SocialPay deeplink        |

### `inquiry(transactionId)`

Check the status of a transaction.

### `payByToken(amount, token, transactionId, lang?)`

Pay using a previously saved token. Language defaults to `"MN"`.

### `getPaymentUrl(invoice, lang?, paymentMethod?)`

Build a redirect URL for the Golomt payment page.

- `lang`: `"MN"` (default) or `"EN"`
- `paymentMethod`: `"payment"` (default) or `"socialpay"`

## License

MIT
