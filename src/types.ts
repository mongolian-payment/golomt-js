// ── Configuration ──

/** Configuration for the GolomtClient */
export interface GolomtConfig {
  /** Base URL of the Golomt Bank API */
  endpoint: string;
  /** HMAC-SHA256 secret key for checksum generation */
  secret: string;
  /** Bearer token for Authorization header */
  bearerToken: string;
}

// ── Constants ──

/** Supported languages for payment URL */
export type Lang = "MN" | "EN";

/** Payment method for URL builder */
export type PaymentMethod = "payment" | "socialpay";

/** Return type for invoice callback */
export type ReturnType = "POST" | "GET" | "MOBILE";

// ── SDK Input Types ──

/** Input for creating an invoice (SDK-facing) */
export interface CreateInvoiceInput {
  /** Payment amount */
  amount: number;
  /** Unique transaction identifier */
  transactionId: string;
  /** How the callback result is returned */
  returnType: ReturnType;
  /** Callback URL for payment result */
  callback: string;
  /** Whether to generate a reusable payment token */
  getToken: boolean;
  /** Whether to generate a SocialPay deeplink */
  socialDeeplink: boolean;
}

// ── Wire Format Types (sent to / received from the API) ──

/** @internal Invoice creation request body sent to the API */
export interface CreateInvoiceRequest {
  amount: string;
  checksum: string;
  transactionId: string;
  returnType: string;
  callback: string;
  genToken: string;
  socialDeeplink: string;
}

/** Response from creating an invoice */
export interface CreateInvoiceResponse {
  /** Generated invoice identifier */
  invoice: string;
  /** Server-computed checksum */
  checksum: string;
  /** Transaction identifier echoed back */
  transactionId: string;
  /** Server timestamp */
  timestamp: string;
  /** HTTP-like status code */
  status: number;
  /** Error identifier (empty on success) */
  error: string;
  /** Human-readable message */
  message: string;
  /** Request path */
  path: string;
  /** SocialPay deeplink URL (if requested) */
  socialDeeplink: string;
}

/** @internal Inquiry request body sent to the API */
export interface InquiryRequest {
  checksum: string;
  transactionId: string;
}

/** Response from a transaction inquiry */
export interface InquiryResponse {
  /** Transaction amount */
  amount: string;
  /** Bank name */
  bank: string;
  /** Transaction status */
  status: string;
  /** Error description (empty on success) */
  errorDesc: string;
  /** Error code (empty on success) */
  errorCode: string;
  /** Cardholder name */
  cardHolder: string;
  /** Masked card number */
  cardNumber: string;
  /** Transaction identifier */
  transactionId: string;
  /** Payment token (if token was generated) */
  token: string;
}

/** @internal Pay-by-token request body sent to the API */
export interface ByTokenRequest {
  amount: string;
  invoice: string;
  checksum: string;
  transactionId: string;
  token: string;
  lang: string;
}

/** Response from a pay-by-token request */
export interface ByTokenResponse {
  /** Transaction amount */
  amount: string;
  /** Error description (empty on success) */
  errorDesc: string;
  /** Error code (empty on success) */
  errorCode: string;
  /** Transaction identifier */
  transactionId: string;
  /** Server-computed checksum */
  checksum: string;
  /** Masked card number */
  cardNumber: string;
}
