# RKRT Infrastructure Reference

## API Keys
- **OpenRouter:** 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
- **Apollo.io:** US8bjSDQ8kcvP9lVVwWA6Q (on hold — Professional plan, not currently used)
- **LIVI Mission Control Bearer Token:** 9bb3f4a7072393a2a8a270af684023d5518848c9e0a7bd0c2d3663d83e82cefa

## Supabase
- **Project ID:** usknntguurefeyzusbdh
- **Owner:** anthony@anthonydazet.com

## Servers
- **DigitalOcean Droplet:** 137.184.182.195
- **OpenClaw Gateway:** port 18789
- **HTTP Bridge:** port 18790

## Edge Functions
| Function | Version | Status | Notes |
|---|---|---|---|
| enrich-agent | v4 | Active | DeepSeek + Perplexity swarm, no Apollo |
| generate-content | v14 | Active | 6 posts/day, 5AM UTC |
| generate-brokerage-content | v7 | Active | Weekly Monday 6AM UTC |
| sync-agents | v10 | Active | FL/TX/NY/CT |
| research-to-lead | v2 | Active | |
| send-email | v1 | Active | Resend, noreply@rkrt.in |
| enrich-agent | — | Deprecated | Apollo version, 403 errors |

## Models
- **Content generation:** deepseek/deepseek-chat via OpenRouter
- **Agent enrichment:** deepseek/deepseek-chat + perplexity/sonar via OpenRouter
- **Brokerage images:** gemini-2.0-flash-exp-image-generation
