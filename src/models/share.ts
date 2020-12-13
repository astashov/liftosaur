declare let __HOST__: string;

export namespace Share {
  export function generateLink(userId: string, id: number): string {
    return `${__HOST__}/record?id=${id}&user=${userId}`;
  }

  export function generateProfileLink(userId: string): string {
    return `${__HOST__}/profile/${userId}`;
  }
}
