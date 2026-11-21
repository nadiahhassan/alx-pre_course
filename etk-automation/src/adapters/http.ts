export type Fetcher = typeof fetch;

export async function getText(f: Fetcher, url: string): Promise<string> {
  const res = await f(url);
  if (!res.ok) throw new Error(`Couldn't download the sheet (HTTP ${res.status}). Check it is published to the web as CSV.`);
  return res.text();
}
