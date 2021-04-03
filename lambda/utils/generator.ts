export namespace UidFactory {
  export function generateUid(length: number): string {
    const domain = "abcdefghijklmnopqrstuvwxyz";
    let uid = "";
    for (let i = 0; i < length; i += 1) {
      uid += domain[Math.floor(Math.random() * domain.length)];
    }
    return uid;
  }
}
