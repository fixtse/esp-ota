import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ReleaseStatistics {
  readonly tag_name: string;
  readonly html_url: string;
  readonly draft: boolean;
  readonly assets: readonly { readonly name: string; readonly download_count: number }[];
}

export function downloadSummary(releases: readonly ReleaseStatistics[]): string {
  const published = releases.filter(release => !release.draft && release.tag_name.startsWith('esphome-'));
  const totals = new Map<string, number>();
  const details: string[] = [];
  for (const release of published) {
    for (const asset of release.assets.filter(asset => asset.name.endsWith('.ota.bin'))) {
      totals.set(asset.name, (totals.get(asset.name) ?? 0) + asset.download_count);
      details.push(`| ${release.tag_name} | ${asset.name} | ${asset.download_count} |`);
    }
  }
  return [
    '# Firmware download statistics', '', `Updated: ${new Date().toISOString()}`, '',
    'Counts are GitHub Release asset downloads, including retries and manual downloads. They are not unique devices or confirmed installations. Raw migration downloads are not included.', '',
    '## Totals by firmware', '', '| Firmware | Downloads |', '| --- | ---: |',
    ...[...totals].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => `| ${name} | ${count} |`), '',
    '## Per release', '', '| Release | Firmware | Downloads |', '| --- | --- | ---: |', ...details, '',
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
