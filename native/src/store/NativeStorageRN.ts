import NativeLiftosaurStorage from "../native/NativeLiftosaurStorage";

export class NativeStorageRN {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async set<T = any>(key: string, value: T): Promise<boolean> {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    return NativeLiftosaurStorage.setValue(key, str);
  }

  public async get(key: string): Promise<string | undefined> {
    const value = await NativeLiftosaurStorage.getValue(key);
    return value ?? undefined;
  }

  public async delete(key: string): Promise<boolean> {
    return NativeLiftosaurStorage.deleteValue(key);
  }

  public async has(key: string): Promise<boolean> {
    return NativeLiftosaurStorage.hasValue(key);
  }

  public async getAllKeys(): Promise<string[]> {
    return NativeLiftosaurStorage.getAllKeys();
  }

  public async clear(): Promise<boolean> {
    const keys = await this.getAllKeys();
    await Promise.all(keys.map((key) => this.delete(key)));
    return true;
  }
}
