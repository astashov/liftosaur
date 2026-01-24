// URL polyfill for environments without native URL support (e.g., QuickJS on watchOS)

interface IParsedURL {
  protocol: string;
  hostname: string;
  port: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
  username: string;
  password: string;
}

function parseURL(url: string): IParsedURL | null {
  const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);
  if (!match) {
    return null;
  }

  const authority = match[4] || "";
  let userInfo = "";
  let host = authority;
  const atIndex = authority.indexOf("@");
  if (atIndex !== -1) {
    userInfo = authority.substring(0, atIndex);
    host = authority.substring(atIndex + 1);
  }

  let username = "";
  let password = "";
  if (userInfo) {
    const colonIndex = userInfo.indexOf(":");
    if (colonIndex !== -1) {
      username = userInfo.substring(0, colonIndex);
      password = userInfo.substring(colonIndex + 1);
    } else {
      username = userInfo;
    }
  }

  let hostname = host;
  let port = "";
  const portMatch = host.match(/^(.+):(\d+)$/);
  if (portMatch) {
    hostname = portMatch[1];
    port = portMatch[2];
  }

  return {
    protocol: match[2] ? match[2] + ":" : "",
    hostname,
    port,
    host,
    pathname: match[5] || "",
    search: match[6] || "",
    hash: match[8] || "",
    username,
    password,
  };
}

export class URLSearchParamsPolyfill {
  private params: Map<string, string[]> = new Map();

  constructor(init?: string | URLSearchParamsPolyfill | Record<string, string> | Array<[string, string]>) {
    if (typeof init === "string") {
      this._parseFromString(init);
    } else if (init instanceof URLSearchParamsPolyfill) {
      init.forEach((value, key) => this.append(key, value));
    } else if (Array.isArray(init)) {
      for (const [key, value] of init) {
        this.append(key, value);
      }
    } else if (init && typeof init === "object") {
      for (const key of Object.keys(init)) {
        this.append(key, init[key]);
      }
    }
  }

  private _parseFromString(query: string): void {
    if (query.startsWith("?")) {
      query = query.slice(1);
    }
    if (!query) {
      return;
    }
    for (const pair of query.split("&")) {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) {
        this.append(decodeURIComponent(pair), "");
      } else {
        const key = decodeURIComponent(pair.substring(0, eqIndex));
        const value = decodeURIComponent(pair.substring(eqIndex + 1));
        this.append(key, value);
      }
    }
  }

  public append(name: string, value: string): void {
    const values = this.params.get(name) || [];
    values.push(value);
    this.params.set(name, values);
  }

  public delete(name: string, value?: string): void {
    if (value === undefined) {
      this.params.delete(name);
    } else {
      const values = this.params.get(name);
      if (values) {
        const filtered = values.filter((v) => v !== value);
        if (filtered.length === 0) {
          this.params.delete(name);
        } else {
          this.params.set(name, filtered);
        }
      }
    }
  }

  public get(name: string): string | null {
    const values = this.params.get(name);
    return values ? values[0] : null;
  }

  public getAll(name: string): string[] {
    return this.params.get(name) || [];
  }

  public has(name: string, value?: string): boolean {
    if (!this.params.has(name)) {
      return false;
    }
    if (value === undefined) {
      return true;
    }
    const values = this.params.get(name)!;
    return values.includes(value);
  }

  public set(name: string, value: string): void {
    this.params.set(name, [value]);
  }

  public sort(): void {
    const sorted = new Map([...this.params.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    this.params = sorted;
  }

  public toString(): string {
    const parts: string[] = [];
    this.params.forEach((values, key) => {
      for (const value of values) {
        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
      }
    });
    return parts.join("&");
  }

  public forEach(
    callback: (value: string, key: string, parent: URLSearchParamsPolyfill) => void,
    thisArg?: unknown
  ): void {
    this.params.forEach((values, key) => {
      for (const value of values) {
        callback.call(thisArg, value, key, this);
      }
    });
  }

  public entries(): IterableIterator<[string, string]> {
    const result: [string, string][] = [];
    this.params.forEach((values, key) => {
      for (const value of values) {
        result.push([key, value]);
      }
    });
    return result[Symbol.iterator]();
  }

  public keys(): IterableIterator<string> {
    const result: string[] = [];
    this.params.forEach((values, key) => {
      for (let i = 0; i < values.length; i++) {
        result.push(key);
      }
    });
    return result[Symbol.iterator]();
  }

  public values(): IterableIterator<string> {
    const result: string[] = [];
    this.params.forEach((values) => {
      for (const value of values) {
        result.push(value);
      }
    });
    return result[Symbol.iterator]();
  }

  public [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries();
  }

  public get size(): number {
    let count = 0;
    this.params.forEach((values) => {
      count += values.length;
    });
    return count;
  }
}

export class URLPolyfill {
  private _protocol: string = "";
  private _hostname: string = "";
  private _port: string = "";
  private _pathname: string = "";
  private _search: string = "";
  private _hash: string = "";
  private _username: string = "";
  private _password: string = "";
  private _searchParams: URLSearchParamsPolyfill;

  constructor(url: string, base?: string | URLPolyfill) {
    url = String(url);
    if (base !== undefined) {
      base = String(base);
      const baseP = parseURL(base);
      if (!baseP || !baseP.protocol) {
        throw new TypeError("Invalid base URL");
      }

      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
        // Absolute URL
        const p = parseURL(url);
        if (p) {
          this._protocol = p.protocol;
          this._hostname = p.hostname;
          this._port = p.port;
          this._pathname = p.pathname;
          this._search = p.search;
          this._hash = p.hash;
          this._username = p.username;
          this._password = p.password;
        }
      } else if (url.indexOf("//") === 0) {
        // Protocol-relative URL
        const p = parseURL(baseP.protocol + url);
        if (p) {
          this._protocol = p.protocol;
          this._hostname = p.hostname;
          this._port = p.port;
          this._pathname = p.pathname;
          this._search = p.search;
          this._hash = p.hash;
          this._username = p.username;
          this._password = p.password;
        }
      } else if (url.indexOf("/") === 0) {
        // Absolute path
        this._protocol = baseP.protocol;
        this._hostname = baseP.hostname;
        this._port = baseP.port;
        this._username = baseP.username;
        this._password = baseP.password;

        let urlPart = url;
        const hashIndex = urlPart.indexOf("#");
        if (hashIndex !== -1) {
          this._hash = urlPart.substring(hashIndex);
          urlPart = urlPart.substring(0, hashIndex);
        }
        const searchIndex = urlPart.indexOf("?");
        if (searchIndex !== -1) {
          this._search = urlPart.substring(searchIndex);
          this._pathname = urlPart.substring(0, searchIndex);
        } else {
          this._pathname = urlPart;
        }
      } else {
        // Relative path
        this._protocol = baseP.protocol;
        this._hostname = baseP.hostname;
        this._port = baseP.port;
        this._username = baseP.username;
        this._password = baseP.password;

        const basePath = baseP.pathname.substring(0, baseP.pathname.lastIndexOf("/") + 1);
        let urlPart = url;
        const hashIndex = urlPart.indexOf("#");
        if (hashIndex !== -1) {
          this._hash = urlPart.substring(hashIndex);
          urlPart = urlPart.substring(0, hashIndex);
        }
        const searchIndex = urlPart.indexOf("?");
        if (searchIndex !== -1) {
          this._search = urlPart.substring(searchIndex);
          this._pathname = basePath + urlPart.substring(0, searchIndex);
        } else {
          this._pathname = basePath + urlPart;
        }
      }
    } else {
      // No base URL
      const p = parseURL(url);
      if (!p || !p.protocol) {
        throw new TypeError("Invalid URL");
      }
      this._protocol = p.protocol;
      this._hostname = p.hostname;
      this._port = p.port;
      this._pathname = p.pathname;
      this._search = p.search;
      this._hash = p.hash;
      this._username = p.username;
      this._password = p.password;
    }

    this._searchParams = new URLSearchParamsPolyfill(this._search);
  }

  public get protocol(): string {
    return this._protocol;
  }

  public set protocol(value: string) {
    this._protocol = value.endsWith(":") ? value : value + ":";
  }

  public get hostname(): string {
    return this._hostname;
  }

  public set hostname(value: string) {
    this._hostname = value;
  }

  public get port(): string {
    return this._port;
  }

  public set port(value: string) {
    this._port = value;
  }

  public get host(): string {
    return this._port ? this._hostname + ":" + this._port : this._hostname;
  }

  public set host(value: string) {
    const portMatch = value.match(/^(.+):(\d+)$/);
    if (portMatch) {
      this._hostname = portMatch[1];
      this._port = portMatch[2];
    } else {
      this._hostname = value;
      this._port = "";
    }
  }

  public get pathname(): string {
    return this._pathname;
  }

  public set pathname(value: string) {
    this._pathname = value.startsWith("/") ? value : "/" + value;
  }

  public get search(): string {
    return this._search;
  }

  public set search(value: string) {
    this._search = value.startsWith("?") ? value : value ? "?" + value : "";
    this._searchParams = new URLSearchParamsPolyfill(this._search);
  }

  public get searchParams(): URLSearchParamsPolyfill {
    return this._searchParams;
  }

  public get hash(): string {
    return this._hash;
  }

  public set hash(value: string) {
    this._hash = value.startsWith("#") ? value : value ? "#" + value : "";
  }

  public get username(): string {
    return this._username;
  }

  public set username(value: string) {
    this._username = value;
  }

  public get password(): string {
    return this._password;
  }

  public set password(value: string) {
    this._password = value;
  }

  public get origin(): string {
    return this._protocol + "//" + this.host;
  }

  public get href(): string {
    let userinfo = "";
    if (this._username) {
      userinfo = this._username;
      if (this._password) {
        userinfo += ":" + this._password;
      }
      userinfo += "@";
    }
    return this._protocol + "//" + userinfo + this.host + this._pathname + this._search + this._hash;
  }

  public set href(value: string) {
    const p = parseURL(value);
    if (!p || !p.protocol) {
      throw new TypeError("Invalid URL");
    }
    this._protocol = p.protocol;
    this._hostname = p.hostname;
    this._port = p.port;
    this._pathname = p.pathname;
    this._search = p.search;
    this._hash = p.hash;
    this._username = p.username;
    this._password = p.password;
    this._searchParams = new URLSearchParamsPolyfill(this._search);
  }

  public toString(): string {
    return this.href;
  }

  public toJSON(): string {
    return this.href;
  }

  public static canParse(url: string, base?: string): boolean {
    try {
      new URLPolyfill(url, base);
      return true;
    } catch {
      return false;
    }
  }
}
