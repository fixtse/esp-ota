import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ReleaseStatistics {
  readonly tag_name: string;
  readonly html_url: string;
  readonly draft: boolean;
  readonly prerelease?: boolean;
  readonly published_at: string;
  readonly assets: readonly { readonly name: string; readonly download_count: number }[];
}

export function downloadSummary(releases: readonly ReleaseStatistics[]): string {
  const published = releases.filter(release => !release.draft && !release.prerelease && release.tag_name.startsWith('esphome-'))
    .toSorted((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  const latest = new Map<string, { release: ReleaseStatistics; count: number }>();
  for (const release of published) {
    for (const asset of release.assets.filter(asset => asset.name.endsWith('.ota.bin'))) {
      if (!latest.has(asset.name)) latest.set(asset.name, { release, count: asset.download_count });
    }
  }
  return [
    '# Firmware download statistics', '', `Updated: ${new Date().toISOString()}`, '',
    "Downloads of each firmware's latest published OTA asset only. Older releases and raw migration downloads are excluded. Counts include retries and manual downloads; they are not unique devices or confirmed installations.", '',
    '| Firmware | Latest release | Downloads |', '| --- | --- | ---: |',
    ...[...latest].sort(([a], [b]) => a.localeCompare(b)).map(([name, { release, count }]) =>
      `| ${name} | [${release.tag_name}](${release.html_url}) | ${count} |`), '',
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const repository = process.env.GITHUB_REPOSITORY ?? 'fixtse/esp-ota';
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
    const releases: ReleaseStatistics[] = [];
    for (let page = 1; ; page += 1) {
      const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`, {
        headers: { Accept: 'application/vnd.github+json', ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}) },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`GitHub statistics request failed: HTTP ${response.status}`);
      const batch: ReleaseStatistics[] = await response.json();
      releases.push(...batch);
      if (batch.length < 100) break;
    }
    const summary = downloadSummary(releases);
    console.log(summary);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  } catch (error) {
    console.error('Firmware download statistics failed', error);
    process.exitCode = 1;
  }
}
