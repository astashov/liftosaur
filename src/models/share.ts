declare let __HOST__: string;

export namespace Share {
  export function generateLink(userId: string, id: number): string {
    return `${__HOST__}/record?id=${id}&user=${userId}`;
  }
}
