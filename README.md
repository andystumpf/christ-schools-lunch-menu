# Christ Schools Menu (Alexa)

Alexa skill that reads the **Christ Schools elementary lunch menu** from the official public Google Calendar and speaks what's for lunch today, on a specific date, on a weekday, or for an entire week.

**Full user documentation:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md) · [docs index](docs/README.md)  
**Developer / deploy guide:** [docs/DEVELOPER.md](docs/DEVELOPER.md)

---

## For users — what to say

Start every request with:

> **"Alexa, ask Christ Schools Menu …"**

| Ask about | Example |
|-----------|---------|
| Today | *…what's for lunch today* |
| Tomorrow | *…what's for lunch tomorrow* |
| A date | *…what's for lunch on August seventeenth* |
| A weekday | *…what's for lunch on Friday* |
| Next week (Mon–Fri) | *…what's for lunch next week* |
| This week (Mon–Fri) | *…what's for lunch this week* |
| Next Tuesday | *…what's for lunch next Tuesday* |
| This coming Wednesday | *…what's for lunch this coming Wednesday* |
| Help | *…help* |

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for sample conversations, troubleshooting, and privacy details.

---

## Skill status

| | Current skill | Legacy (retire after cutover) |
|---|---|---|
| **Name** | Christ Schools Menu | Christ Lincoln Schools Menu |
| **Invocation** | `christ schools menu` | `c. l. s. menu` |
| **Skill ID** | `amzn1.ask.skill.dc4a98f9-ff3f-4f16-bef6-a421364c411f` | `amzn1.ask.skill.8d9936d5-800e-48fd-9a2c-6c5e318348cb` |
| **Stage** | Development | Live |

Enable and certify the **Aug 3, 2026** skill, then disable older published lunch skills so Echo routes correctly.

---

## Calendar source

- [View lunch calendar (web)](https://calendar.google.com/calendar/embed?src=christschools.org_f2uc72cd4bn3mgglvl1j49a7sk%40group.calendar.google.com&ctz=America%2FChicago)
- [ICS feed](https://calendar.google.com/calendar/ical/christschools.org_f2uc72cd4bn3mgglvl1j49a7sk%40group.calendar.google.com/public/basic.ics)

Timezone: **America/Chicago**

---

## Developer quick start

```bash
cd lambda && npm install && npm test
```

Deploy via Alexa-hosted CodeCommit (`git push origin master`). See [docs/DEVELOPER.md](docs/DEVELOPER.md).

**Test in Developer Console:** use **Skill I/O** or **Manual JSON** — not Alexa Simulator (routes to legacy skills while they remain live).

---

## Project layout

```
lambda/index.js                          # Skill handler
lambda/test-menu.js                      # Local calendar test
skill-package/skill.json                 # Store listing & endpoints
skill-package/interactionModels/...      # Voice interaction model
docs/USER_GUIDE.md                       # End-user documentation
docs/DEVELOPER.md                        # Maintainer documentation
docs/README.md                           # Documentation index
```
