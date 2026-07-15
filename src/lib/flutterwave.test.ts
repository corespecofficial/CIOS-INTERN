import { describe, expect, it } from "vitest";
import { isFlutterwaveCheckoutUrl } from "./flutterwave-url";

describe("isFlutterwaveCheckoutUrl", () => {
  it.each([
    "https://checkout.flutterwave.com/v3/hosted/pay/token",
    "https://checkout-v2.flutterwave.com/pay/token",
    "https://flutterwave.com/pay/token",
    "https://checkout-v2.dev-flutterwave.com/pay/token",
    "https://api.ravepay.co/flwv3-pug/getpaidx/api/v2/hosted/pay/token",
  ])("accepts an official Flutterwave HTTPS checkout: %s", (url) => {
    expect(isFlutterwaveCheckoutUrl(url)).toBe(true);
  });

  it.each([
    "http://checkout.flutterwave.com/pay/token",
    "javascript:alert(1)",
    "",
  ])("rejects an unsafe redirect: %s", (url) => {
    expect(isFlutterwaveCheckoutUrl(url)).toBe(false);
  });
});
