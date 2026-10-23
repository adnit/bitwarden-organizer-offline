import type { VaultItem } from '../types/bitwarden';
import { getHostname } from 'tldts';

/**
 * Category → known domains. A hostname matches its most specific listed
 * suffix, so "aws.amazon.com" beats "amazon.com".
 */
const CATEGORY_DOMAINS: Record<string, string[]> = {
  'Email': [
    'gmail.com', 'outlook.com', 'live.com', 'hotmail.com', 'yahoo.com', 'proton.me', 'protonmail.com',
    'mail.google.com', 'outlook.live.com', 'mail.yahoo.com', 'icloud.com', 'zoho.com', 'fastmail.com', 'tutanota.com', 'gmx.com', 'gmx.net', 'aol.com', 'mail.ru',
  ],
  'Social': [
    'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'reddit.com', 'tiktok.com',
    'snapchat.com', 'pinterest.com', 'tumblr.com', 'discord.com', 'telegram.org', 'whatsapp.com',
    'threads.net', 'bsky.app', 'mastodon.social', 'quora.com', 'vk.com',
  ],
  'Finance': [
    'paypal.com', 'stripe.com', 'wise.com', 'revolut.com', 'venmo.com', 'cash.app', 'chase.com',
    'bankofamerica.com', 'wellsfargo.com', 'citi.com', 'capitalone.com', 'americanexpress.com',
    'hsbc.com', 'barclays.co.uk', 'monzo.com', 'n26.com', 'coinbase.com', 'binance.com', 'kraken.com',
    'robinhood.com', 'fidelity.com', 'vanguard.com', 'schwab.com', 'etrade.com', 'mint.com',
    'creditkarma.com', 'klarna.com', 'payoneer.com',
  ],
  'Shopping': [
    'amazon.com', 'amazon.co.uk', 'amazon.de', 'ebay.com', 'etsy.com', 'aliexpress.com', 'walmart.com',
    'target.com', 'bestbuy.com', 'ikea.com', 'shein.com', 'temu.com', 'zalando.com', 'asos.com',
    'wish.com', 'shopify.com', 'costco.com', 'newegg.com',
  ],
  'Development': [
    'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'npmjs.com', 'docker.com',
    'vercel.com', 'netlify.com', 'heroku.com', 'digitalocean.com', 'cloudflare.com', 'aws.amazon.com',
    'amazonaws.com', 'azure.com', 'jetbrains.com', 'atlassian.com', 'atlassian.net', 'pypi.org',
    'hub.docker.com', 'render.com', 'fly.io', 'supabase.com', 'firebase.google.com', 'anthropic.com',
    'openai.com', 'replit.com', 'codepen.io',
  ],
  'Entertainment': [
    'netflix.com', 'spotify.com', 'youtube.com', 'twitch.tv', 'hulu.com', 'disneyplus.com', 'hbomax.com',
    'max.com', 'primevideo.com', 'crunchyroll.com', 'soundcloud.com', 'deezer.com', 'tidal.com',
    'steampowered.com', 'steamcommunity.com', 'epicgames.com', 'playstation.com', 'xbox.com',
    'nintendo.com', 'ea.com', 'ubisoft.com', 'battle.net', 'blizzard.com', 'riotgames.com', 'roblox.com',
    'gog.com', 'audible.com', 'plex.tv',
  ],
  'Work & Productivity': [
    'slack.com', 'zoom.us', 'notion.so', 'trello.com', 'asana.com', 'monday.com', 'figma.com',
    'canva.com', 'dropbox.com', 'box.com', 'evernote.com', 'office.com', 'microsoftonline.com',
    'microsoft.com', 'clickup.com', 'airtable.com', 'miro.com', 'calendly.com', 'docusign.com',
    'adobe.com', 'grammarly.com', '1password.com', 'lastpass.com', 'bitwarden.com',
  ],
  'Travel': [
    'booking.com', 'airbnb.com', 'expedia.com', 'tripadvisor.com', 'uber.com', 'lyft.com', 'kayak.com',
    'skyscanner.net', 'ryanair.com', 'easyjet.com', 'delta.com', 'united.com', 'aa.com',
    'lufthansa.com', 'emirates.com', 'hotels.com', 'trivago.com', 'bolt.eu',
  ],
};

/** Keyword fallbacks matched against the domain and item name. */
const CATEGORY_KEYWORDS: [string, RegExp][] = [
  ['Finance', /\b(bank|banking|credit|invest|crypto|wallet|pay|tax|insurance)\b/i],
  ['Shopping', /\b(shop|store|market)\b/i],
  ['Email', /\b(mail|webmail)\b/i],
  ['Travel', /\b(air|airline|airways|hotel|travel|rail)\b/i],
  ['Development', /\b(git|dev|api|cloud|server|hosting|vps)\b/i],
];

const DOMAIN_TO_CATEGORY = new Map<string, string>(
  Object.entries(CATEGORY_DOMAINS).flatMap(([cat, domains]) => domains.map((d) => [d, cat] as const)),
);

/** Suggests a folder name for an item, or null when nothing fits. */
export function suggestCategory(item: VaultItem): string | null {
  if (item.type === 3) return 'Cards';
  if (item.type === 4) return 'Identities';

  const uri = item.login?.uris?.[0]?.uri;
  const hostname = uri ? getHostname(uri) : null;
  if (hostname) {
    const labels = hostname.toLowerCase().split('.');
    for (let i = 0; i < labels.length - 1; i++) {
      const known = DOMAIN_TO_CATEGORY.get(labels.slice(i).join('.'));
      if (known) return known;
    }
  }

  const haystack = `${hostname ?? ''} ${item.name ?? ''}`.replace(/[.\-_]/g, ' ');
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(haystack)) return cat;
  }
  return null;
}
