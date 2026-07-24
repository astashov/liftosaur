import "mocha";
import { expect } from "chai";
import { SafeLocalStorage_getItem } from "../src/utils/safeLocalStorage";
import { Platform_onelink } from "../src/utils/platform";

describe("SafeLocalStorage", () => {
  const originalWindow = (global as { window?: unknown }).window;

  afterEach(() => {
    (global as { window?: unknown }).window = originalWindow;
  });

  function setWindowWithThrowingLocalStorage(): void {
    (global as { window?: unknown }).window = {
      location: { href: "https://www.liftosaur.com/programs/abc", pathname: "/programs/abc" },
      get localStorage(): Storage {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    };
  }

  it("returns null instead of throwing when localStorage access throws (iOS Safari blocked storage)", () => {
    setWindowWithThrowingLocalStorage();
    expect(() => SafeLocalStorage_getItem("utm_source")).to.not.throw();
    expect(SafeLocalStorage_getItem("utm_source")).to.equal(null);
  });

  it("Platform_onelink does not throw when localStorage is blocked", () => {
    setWindowWithThrowingLocalStorage();
    expect(() => Platform_onelink(false)).to.not.throw();
  });
});
