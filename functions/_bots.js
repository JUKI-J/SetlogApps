// Shared by functions/_middleware.js and functions/go/[slug].js (single source for crawler/ad-bot UAs).
// An empty User-Agent is NOT a bot (it is treated like a normal visitor).
export const BOT_UA = /Googlebot|AdsBot-Google|Google-Adwords|GoogleOther|Storebot-Google|APIs-Google|Google-InspectionTool|Mediapartners-Google|bingbot|Applebot|Yeti|DuckDuckBot|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|YandexBot|Baiduspider|PetalBot|GPTBot|ClaudeBot|Bytespider|Sogou|360Spider|SeznamBot/i;
