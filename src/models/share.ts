declare let __HOST__: string;

export function Share_generateLink(userId: string, id: number): string {
  return `${__HOST__}/record?id=${id}&user=${userId}`;
}

export function Share_generateProfileLink(userId: string): string {
  return `${__HOST__}/profile/${userId}`;
}
