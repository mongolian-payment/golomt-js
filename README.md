# @mongolian-payment/golomt

Golomt Bank ecommerce payment SDK for Node.js — create invoices, inquire transaction status, pay by token, with automatic HMAC-SHA256 checksum generation.

[![npm version](https://img.shields.io/npm/v/@mongolian-payment/golomt.svg)](https://www.npmjs.com/package/@mongolian-payment/golomt)
[![license](https://img.shields.io/npm/l/@mongolian-payment/golomt.svg)](./LICENSE)

> Part of the **[mongolian-payment](https://github.com/mongolian-payment)** SDK suite.
> Also available for Python: **[mongolian-payment-golomt](https://pypi.org/project/mongolian-payment-golomt/)** ([source](https://github.com/mongolian-payment/golomt-py)).

## Requirements

- Node.js >= 18.0.0 (uses native `fetch`)

## Installation

```bash
npm install @mongolian-payment/golomt
```

## Quick Start

```typescript
import { GolomtClient } from "@mongolian-payment/golomt";

const client = new GolomtClient({
  endpoint: "https://ecommerce.golomtbank.com",
  secret: "YOUR_HMAC_SECRET",
  bearerToken: "YOUR_BEARER_TOKEN",
});

// Create an invoice
const invoice = await client.createInvoice({
  amount: 50000,
  transactionId: "order-12345",
  returnType: "POST",
  callback: "https://yourapp.com/payment/callback",
  getToken: false,
  socialDeeplink: false,
});

console.log(invoice.invoice); // Invoice identifier

// Build a payment URL to redirect the user
const paymentUrl = client.getPaymentUrl(invoice.invoice);
// => "https://ecommerce.golomtbank.com/payment/MN/..."

// Check transaction status
const status = await client.inquiry("order-12345");
console.log(status.status);
```

## Configuration from Environment Variables

```typescript
import { GolomtClient, loadConfigFromEnv } from "@mongolian-payment/golomt";

const client = new GolomtClient(loadConfigFromEnv());
```

| Variable              | Description                           |
| --------------------- | ------------------------------------- |
| `GOLOMT_ENDPOINT`     | Base URL of the Golomt Bank API       |
| `GOLOMT_SECRET`       | HMAC-SHA256 secret key                |
| `GOLOMT_BEARER_TOKEN` | Bearer token for Authorization header |

> Never hard-code credentials — load them from the environment or a secrets vault.

## API Reference

Checksums are computed automatically (HMAC-SHA256) and the bearer token is sent on
every request.

| Method | Description |
|--------|-------------|
| `createInvoice(input)` | Create a payment invoice → `{ invoice, checksum, transactionId, timestamp, status, error, message, path, socialDeeplink }` |
| `inquiry(transactionId)` | Check the status of a transaction |
| `payByToken(amount, token, transactionId, lang?)` | Pay using a previously saved token (`lang` defaults to `"MN"`) |
| `getPaymentUrl(invoice, lang?, paymentMethod?)` | Build a redirect URL for the Golomt payment page |

`createInvoice` accepts the following fields:

| Field            | Type         | Description                       |
| ---------------- | ------------ | --------------------------------- |
| `amount`         | `number`     | Payment amount                    |
| `transactionId`  | `string`     | Unique transaction identifier     |
| `returnType`     | `ReturnType` | `"POST"`, `"GET"`, or `"MOBILE"`  |
| `callback`       | `string`     | Callback URL for payment result   |
| `getToken`       | `boolean`    | Generate a reusable payment token |
| `socialDeeplink` | `boolean`    | Generate a SocialPay deeplink     |

```typescript
// getPaymentUrl: lang is "MN" (default) or "EN";
// paymentMethod is "payment" (default) or "socialpay"
const url = client.getPaymentUrl(invoice.invoice, "EN", "socialpay");

// Pay with a saved token (from an invoice created with getToken: true)
const result = await client.payByToken(50000, "saved-token", "order-67890");
console.log(result.transactionId, result.cardNumber);
```

## Error Handling

All API errors throw `GolomtError`, which includes the HTTP status code and response body:

```typescript
import { GolomtError } from "@mongolian-payment/golomt";

try {
  await client.inquiry("invalid_id");
} catch (err) {
  if (err instanceof GolomtError) {
    console.error(err.message);    // Human-readable message
    console.error(err.statusCode); // HTTP status code (e.g. 404)
    console.error(err.response);   // Raw response body
  }
}
```

## License

MIT
