import { createHmac } from "crypto";
import type {
  GolomtConfig,
  CreateInvoiceInput,
  CreateInvoiceRequest,
  CreateInvoiceResponse,
  InquiryRequest,
  InquiryResponse,
  ByTokenRequest,
  ByTokenResponse,
  Lang,
  PaymentMethod,
} from "./types.js";
import { GolomtError } from "./errors.js";

/**
 * Golomt Bank ecommerce payment client.
 *
 * Handles HMAC-SHA256 checksum generation, request formatting, and
 * communication with the Golomt Bank API.
 *
 * @example
 * ```ts
 * const client = new GolomtClient({
 *   endpoint: "https://ecommerce.golomtbank.com",
 *   secret: "your-hmac-secret",
 *   bearerToken: "your-bearer-token",
 * });
 *
 * const invoice = await client.createInvoice({
 *   amount: 1000,
 *   transactionId: "txn-001",
 *   returnType: "POST",
 *   callback: "https://yoursite.com/callback",
 *   getToken: false,
 *   socialDeeplink: false,
 * });
 * ```
 */
export class GolomtClient {
  private readonly config: GolomtConfig;

  constructor(config: GolomtConfig) {
    this.config = config;
  }

  /**
   * Compute an HMAC-SHA256 hex digest.
   *
   * The data string is a direct concatenation of values with no separator,
   * matching the Go SDK's `AppendAsString` behavior.
   */
  private hmac(data: string): string {
    return createHmac("sha256", this.config.secret)
      .update(data)
      .digest("hex");
  }

  /**
   * Send a POST request to the Golomt Bank API.
   */
  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.config.endpoint}${path}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.bearerToken}`,
      },
      body: JSON.stringify(body),
    });

    let responseBody: unknown;
    try {
      responseBody = await res.json();
    } catch {
      throw new GolomtError(
        `Golomt API returned non-JSON response (HTTP ${res.status})`,
        res.status,
      );
    }

    if (!res.ok) {
      const msg =
        typeof responseBody === "object" &&
        responseBody !== null &&
        "message" in responseBody
          ? String((responseBody as Record<string, unknown>).message)
          : `Golomt API error (HTTP ${res.status})`;

      throw new GolomtError(msg, res.status, responseBody);
    }

    return responseBody as T;
  }

  /**
   * Format a number as a two-decimal-place string (e.g. `1000` -> `"1000.00"`).
   */
  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Create a payment invoice.
   *
   * Automatically computes the HMAC-SHA256 checksum from:
   *   `transactionId + amount + returnType + callback`
   *
   * Converts boolean fields (`getToken`, `socialDeeplink`) to `"Y"` / `"N"`.
   *
   * @param input - Invoice creation parameters
   * @returns The API response containing the invoice ID and metadata
   */
  async createInvoice(
    input: CreateInvoiceInput,
  ): Promise<CreateInvoiceResponse> {
    const amount = this.formatAmount(input.amount);
    const checksum = this.hmac(
      input.transactionId + amount + input.returnType + input.callback,
    );

    const body: CreateInvoiceRequest = {
      amount,
      checksum,
      transactionId: input.transactionId,
      returnType: input.returnType,
      callback: input.callback,
      genToken: input.getToken ? "Y" : "N",
      socialDeeplink: input.socialDeeplink ? "Y" : "N",
    };

    return this.post<CreateInvoiceResponse>("/api/invoice", body);
  }

  /**
   * Inquire about a transaction's status.
   *
   * Automatically computes the HMAC-SHA256 checksum from:
   *   `transactionId + transactionId` (same value concatenated twice)
   *
   * @param transactionId - The transaction to inquire about
   * @returns The API response with transaction details
   */
  async inquiry(transactionId: string): Promise<InquiryResponse> {
    const checksum = this.hmac(transactionId + transactionId);

    const body: InquiryRequest = {
      checksum,
      transactionId,
    };

    return this.post<InquiryResponse>("/api/inquiry", body);
  }

  /**
   * Pay using a previously generated token.
   *
   * Automatically computes the HMAC-SHA256 checksum from:
   *   `amount + transactionId + token`
   *
   * @param amount - Payment amount
   * @param token - Payment token from a prior invoice with `getToken: true`
   * @param transactionId - Unique transaction identifier
   * @param lang - Language code (defaults to `"MN"`)
   * @returns The API response with payment result
   */
  async payByToken(
    amount: number,
    token: string,
    transactionId: string,
    lang: string = "MN",
  ): Promise<ByTokenResponse> {
    const amountStr = this.formatAmount(amount);
    const checksum = this.hmac(amountStr + transactionId + token);

    const body: ByTokenRequest = {
      amount: amountStr,
      invoice: "",
      checksum,
      transactionId,
      token,
      lang,
    };

    return this.post<ByTokenResponse>("/api/pay", body);
  }

  /**
   * Build a payment URL for redirecting the user to the Golomt payment page.
   *
   * @param invoice - Invoice identifier returned from `createInvoice`
   * @param lang - Language: `"MN"` (Mongolian) or `"EN"` (English). Defaults to `"MN"`.
   * @param paymentMethod - Payment method: `"payment"` (card) or `"socialpay"`. Defaults to `"payment"`.
   * @returns The full payment URL string
   */
  getPaymentUrl(
    invoice: string,
    lang: Lang = "MN",
    paymentMethod: PaymentMethod = "payment",
  ): string {
    return `${this.config.endpoint}/${paymentMethod}/${lang}/${invoice}`;
  }
}
