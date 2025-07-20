import { VERSION } from "../src/index";

describe("Sample Tests", () => {
  test("VERSION should be defined", () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe("string");
  });
});