import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { GolomtClient } from "../src/client.js";
import { GolomtError } from "../src/errors.js";
import { loadConfigFromEnv } from "../src/config.js";
import type { GolomtConfig, CreateInvoiceInput } from "../src/types.js";

// ── Helpers ──

const TEST_CONFIG: GolomtConfig = {
  endpoint: "https://ecommerce.golomtbank.com",
  secret: "test-secret-key",
  bearerToken: "test-bearer-token",
};

function hmac(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

// ── Tests ──

describe("GolomtClient", () => {
  let client: GolomtClient;

  beforeEach(() => {
    client = new GolomtClient(TEST_CONFIG);
    vi.restoreAllMocks();
  });

  // ── createInvoice ──

  describe("createInvoice", () => {
    const input: CreateInvoiceInput = {
      amount: 1500,
      transactionId: "txn-001",
      returnType: "POST",
      callback: "https://example.com/callback",
      getToken: false,
      socialDeeplink: false,
    };

    it("should send correct request body with auto-generated checksum", async () => {
      const responseBody = {
        invoice: "inv-123",
        checksum: "server-checksum",
        transactionId: "txn-001",
        timestamp: "2026-01-01T00:00:00Z",
        status: 200,
        error: "",
        message: "",
        path: "/api/invoice",
        socialDeeplink: "",
      };

      const fetchMock = mockFetch(responseBody);
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.createInvoice(input);

      expect(fetchMock).toHaveBeenCalledOnce();

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://ecommerce.golomtbank.com/api/invoice");
      expect(options.method).toBe("POST");
      expect(options.headers["Authorization"]).toBe(
        "Bearer test-bearer-token",
      );
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(options.body);
      const expectedChecksum = hmac(
        TEST_CONFIG.secret,
        "txn-001" + "1500.00" + "POST" + "https://example.com/callback",
      );
      expect(body.checksum).toBe(expectedChecksum);
      expect(body.amount).toBe("1500.00");
      expect(body.transactionId).toBe("txn-001");
      expect(body.returnType).toBe("POST");
      expect(body.callback).toBe("https://example.com/callback");
      expect(body.genToken).toBe("N");
      expect(body.socialDeeplink).toBe("N");

      expect(result).toEqual(responseBody);
    });

    it("should convert getToken=true to genToken='Y'", async () => {
      const fetchMock = mockFetch({ invoice: "inv-456" });
      vi.stubGlobal("fetch", fetchMock);

      await client.createInvoice({ ...input, getToken: true });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.genToken).toBe("Y");
    });

    it("should convert socialDeeplink=true to 'Y'", async () => {
      const fetchMock = mockFetch({ invoice: "inv-789" });
      vi.stubGlobal("fetch", fetchMock);

      await client.createInvoice({ ...input, socialDeeplink: true });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.socialDeeplink).toBe("Y");
    });

    it("should format amount with two decimal places", async () => {
      const fetchMock = mockFetch({ invoice: "inv-dec" });
      vi.stubGlobal("fetch", fetchMock);

      await client.createInvoice({ ...input, amount: 99 });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.amount).toBe("99.00");
    });
  });

  // ── inquiry ──

  describe("inquiry", () => {
    it("should send correct request with doubled transactionId checksum", async () => {
      const responseBody = {
        amount: "1500.00",
        bank: "golomt",
        status: "success",
        errorDesc: "",
        errorCode: "",
        cardHolder: "John Doe",
        cardNumber: "4111****1111",
        transactionId: "txn-001",
        token: "",
      };

      const fetchMock = mockFetch(responseBody);
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.inquiry("txn-001");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://ecommerce.golomtbank.com/api/inquiry");

      const body = JSON.parse(options.body);
      const expectedChecksum = hmac(
        TEST_CONFIG.secret,
        "txn-001" + "txn-001",
      );
      expect(body.checksum).toBe(expectedChecksum);
      expect(body.transactionId).toBe("txn-001");

      expect(result).toEqual(responseBody);
    });
  });

  // ── payByToken ──

  describe("payByToken", () => {
    it("should send correct request with amount+transactionId+token checksum", async () => {
      const responseBody = {
        amount: "500.00",
        errorDesc: "",
        errorCode: "",
        transactionId: "txn-002",
        checksum: "server-checksum",
        cardNumber: "4111****1111",
      };

      const fetchMock = mockFetch(responseBody);
      vi.stubGlobal("fetch", fetchMock);

      const result = await client.payByToken(
        500,
        "tok-abc",
        "txn-002",
        "EN",
      );

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://ecommerce.golomtbank.com/api/pay");

      const body = JSON.parse(options.body);
      const expectedChecksum = hmac(
        TEST_CONFIG.secret,
        "500.00" + "txn-002" + "tok-abc",
      );
      expect(body.checksum).toBe(expectedChecksum);
      expect(body.amount).toBe("500.00");
      expect(body.transactionId).toBe("txn-002");
      expect(body.token).toBe("tok-abc");
      expect(body.lang).toBe("EN");
      expect(body.invoice).toBe("");

      expect(result).toEqual(responseBody);
    });

    it("should default lang to 'MN'", async () => {
      const fetchMock = mockFetch({ amount: "100.00" });
      vi.stubGlobal("fetch", fetchMock);

      await client.payByToken(100, "tok-xyz", "txn-003");

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.lang).toBe("MN");
    });
  });

  // ── getPaymentUrl ──

  describe("getPaymentUrl", () => {
    it("should build URL with defaults (payment, MN)", () => {
      const url = client.getPaymentUrl("inv-123");
      expect(url).toBe(
        "https://ecommerce.golomtbank.com/payment/MN/inv-123",
      );
    });

    it("should build URL with EN language", () => {
      const url = client.getPaymentUrl("inv-123", "EN");
      expect(url).toBe(
        "https://ecommerce.golomtbank.com/payment/EN/inv-123",
      );
    });

    it("should build URL with socialpay method", () => {
      const url = client.getPaymentUrl("inv-123", "MN", "socialpay");
      expect(url).toBe(
        "https://ecommerce.golomtbank.com/socialpay/MN/inv-123",
      );
    });

    it("should build URL with EN and socialpay", () => {
      const url = client.getPaymentUrl("inv-123", "EN", "socialpay");
      expect(url).toBe(
        "https://ecommerce.golomtbank.com/socialpay/EN/inv-123",
      );
    });
  });

  // ── Error handling ──

  describe("error handling", () => {
    it("should throw GolomtError on non-OK response", async () => {
      const errorBody = {
        status: 401,
        error: "Unauthorized",
        message: "Invalid bearer token",
        path: "/api/invoice",
      };

      const fetchMock = mockFetch(errorBody, 401);
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        client.createInvoice({
          amount: 100,
          transactionId: "txn-fail",
          returnType: "POST",
          callback: "https://example.com/cb",
          getToken: false,
          socialDeeplink: false,
        }),
      ).rejects.toThrow(GolomtError);

      try {
        await client.createInvoice({
          amount: 100,
          transactionId: "txn-fail",
          returnType: "POST",
          callback: "https://example.com/cb",
          getToken: false,
          socialDeeplink: false,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(GolomtError);
        const golomtErr = err as GolomtError;
        expect(golomtErr.message).toBe("Invalid bearer token");
        expect(golomtErr.statusCode).toBe(401);
        expect(golomtErr.response).toEqual(errorBody);
      }
    });

    it("should throw GolomtError on non-JSON response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error("invalid json")),
        }),
      );

      await expect(
        client.createInvoice({
          amount: 100,
          transactionId: "txn-json-fail",
          returnType: "POST",
          callback: "https://example.com/cb",
          getToken: false,
          socialDeeplink: false,
        }),
      ).rejects.toThrow("non-JSON response");
    });
  });
});

// ── loadConfigFromEnv ──

describe("loadConfigFromEnv", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOLOMT_ENDPOINT;
    delete process.env.GOLOMT_SECRET;
    delete process.env.GOLOMT_BEARER_TOKEN;
  });

  it("should load config from environment variables", () => {
    process.env.GOLOMT_ENDPOINT = "https://ecommerce.golomtbank.com";
    process.env.GOLOMT_SECRET = "my-secret";
    process.env.GOLOMT_BEARER_TOKEN = "my-token";

    const config = loadConfigFromEnv();
    expect(config).toEqual({
      endpoint: "https://ecommerce.golomtbank.com",
      secret: "my-secret",
      bearerToken: "my-token",
    });
  });

  it("should throw if GOLOMT_ENDPOINT is missing", () => {
    process.env.GOLOMT_SECRET = "my-secret";
    process.env.GOLOMT_BEARER_TOKEN = "my-token";

    expect(() => loadConfigFromEnv()).toThrow("GOLOMT_ENDPOINT");
  });

  it("should throw if GOLOMT_SECRET is missing", () => {
    process.env.GOLOMT_ENDPOINT = "https://ecommerce.golomtbank.com";
    process.env.GOLOMT_BEARER_TOKEN = "my-token";

    expect(() => loadConfigFromEnv()).toThrow("GOLOMT_SECRET");
  });

  it("should throw if GOLOMT_BEARER_TOKEN is missing", () => {
    process.env.GOLOMT_ENDPOINT = "https://ecommerce.golomtbank.com";
    process.env.GOLOMT_SECRET = "my-secret";

    expect(() => loadConfigFromEnv()).toThrow("GOLOMT_BEARER_TOKEN");
  });
});

// ── GolomtError ──

describe("GolomtError", () => {
  it("should be an instance of Error", () => {
    const err = new GolomtError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GolomtError);
  });

  it("should preserve name, statusCode, and response", () => {
    const err = new GolomtError("fail", 500, { detail: "server error" });
    expect(err.name).toBe("GolomtError");
    expect(err.message).toBe("fail");
    expect(err.statusCode).toBe(500);
    expect(err.response).toEqual({ detail: "server error" });
  });
});
