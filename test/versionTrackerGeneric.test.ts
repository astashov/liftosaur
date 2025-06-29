import "mocha";
import { expect } from "chai";
import { VersionTracker } from "../src/models/versionTracker";
import { IVersions } from "../src/types";

interface ICustomObject {
  name: string;
  age: number;
  settings: {
    theme: string;
    notifications: boolean;
  };
  tags: string[];
  [key: string]: any;
}

interface IApp {
  users: Record<string, { name: string; active: boolean }>;
  config: {
    features: Record<string, boolean>;
  };
  [key: string]: any;
}

interface IProduct {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  [key: string]: any;
}

describe("VersionTracker - Generic Usage", () => {
  it("should work with any object type", () => {
    const oldObj: ICustomObject = {
      name: "John",
      age: 30,
      settings: {
        theme: "light",
        notifications: true,
      },
      tags: ["developer", "typescript"],
    };

    const newObj: ICustomObject = {
      name: "John",
      age: 31, // Changed
      settings: {
        theme: "dark", // Changed
        notifications: true,
      },
      tags: ["developer", "typescript", "react"], // Changed
    };

    const versions = VersionTracker.updateVersions(oldObj, newObj, {}, 1000);

    expect(versions).to.deep.equal({
      age: 1000,
      settings: {
        theme: 1000,
      },
      tags: 1000,
    });
  });

  it("should support custom dictionary fields", () => {
    const oldApp: IApp = {
      users: {
        user1: { name: "Alice", active: true },
        user2: { name: "Bob", active: false },
      },
      config: {
        features: {
          darkMode: true,
          beta: false,
        },
      },
    };

    const newApp: IApp = {
      users: {
        user1: { name: "Alice", active: false }, // Changed
        // user2 removed
        user3: { name: "Charlie", active: true }, // Added
      },
      config: {
        features: {
          darkMode: true,
          beta: true, // Changed
        },
      },
    };

    // Specify which fields are dictionaries
    const dictionaryFields = ["users", "config.features"];

    const versions = VersionTracker.updateVersions(oldApp, newApp, {}, 2000, dictionaryFields);

    // Dictionary fields are versioned as collections
    expect(versions).to.deep.equal({
      users: {
        items: {
          user1: 2000, // Changed
          user3: 2000, // Added
        },
        deleted: {
          user2: 2000, // Removed
        },
      },
      config: {
        features: {
          items: {
            beta: 2000, // Changed
          },
          deleted: {},
        },
      },
    });
  });

  it("should preserve type safety with generics", () => {
    const oldProduct: IProduct = {
      id: "prod-1",
      name: "Widget",
      price: 9.99,
      inStock: true,
    };

    const newProduct: IProduct = {
      id: "prod-1",
      name: "Super Widget",
      price: 12.99,
      inStock: true,
    };

    const existingVersions: IVersions<IProduct> = {
      inStock: 500,
    };

    const versions = VersionTracker.updateVersions(oldProduct, newProduct, existingVersions, 3000);

    // Type-safe result
    const result: IVersions<IProduct> = versions;

    expect(result).to.deep.equal({
      name: 3000,
      price: 3000,
      inStock: 500, // Preserved from existing
    });
  });
});
