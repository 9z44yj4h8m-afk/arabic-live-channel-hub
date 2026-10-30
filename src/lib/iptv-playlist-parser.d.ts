declare module "iptv-playlist-parser" {
  const parser: { parse(input: string): { items: Array<{ name: string; url: string; tvg: { logo: string }; group: { title: string }; http: { referrer: string; "user-agent": string }; line: number }> } };
  export default parser;
}