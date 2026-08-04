# Christ Schools Menu — Developer Guide

Technical documentation for maintaining and deploying the Alexa skill.

---

## Skills in this account

| Skill | Skill ID | Stage | Invocation | Notes |
|-------|----------|-------|------------|-------|
| **Christ Schools Menu** (current) | `amzn1.ask.skill.dc4a98f9-ff3f-4f16-bef6-a421364c411f` | Development | `christ schools menu` | **Use this skill.** Full feature set. |
| Christ Schools Menu (legacy live) | `amzn1.ask.skill.0ee0c251-3375-4f80-9b09-885b8a5e91d5` | **Live** | `christ schools menu` | Older published skill; Echo may route here until retired. |
| Christ Lincoln Schools Menu | `amzn1.ask.skill.8d9936d5-800e-48fd-9a2c-6c5e318348cb` | Live | `c. l. s. menu` | Original hosted skill; invocation name locked after publish. |

**Recommendation:** Certify `dc4a98f9…`, then disable legacy live skills to avoid routing conflicts.

---

## Architecture

```
User → Alexa NLU → Lambda (Node.js 16) → Google Calendar ICS → spoken response + card
```

| Component | Location |
|-----------|----------|
| Skill handler | `lambda/index.js` |
| Interaction model | `skill-package/interactionModels/custom/en-US.json` |
| Skill manifest | `skill-package/skill.json` |
| Calendar URL | `christschools.org` public ICS (see `CALENDAR_URL` in `index.js`) |
| Timezone | `America/Chicago` |

### Intents

| Intent | Purpose |
|--------|---------|
| `searchIntent` | Single-day lookup (today, dates, weekdays, next Tuesday, etc.) |
| `weekMenuIntent` | Monday–Friday summary for `next week` or `this week` |
| `AMAZON.HelpIntent` | Speaks built-in help examples |
| `AMAZON.StopIntent` / `CancelIntent` | Exit |

### Custom slot types

- **WeekReference:** `next week`, `this week`
- **DayModifier:** `next`, `this`, `this coming` (used with `AMAZON.DayOfWeek`)

---

## Deploy (Alexa-hosted)

Hosted skill CodeCommit repo: skill UUID without `amzn1.ask.skill.` prefix.

```bash
# Generate credentials
ask smapi generate-credentials-for-alexa-hosted-skill \
  -s amzn1.ask.skill.dc4a98f9-ff3f-4f16-bef6-a421364c411f \
  --repository-url "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/dc4a98f9-ff3f-4f16-bef6-a421364c411f" \
  --repository-type GIT

# Push master → development, prod → live
git push origin master
git push origin prod
```

**Important:** `skill-package/skill.json` must include Lambda endpoint ARNs. An empty `apis.custom` object will break testing (no endpoint).

---

## Test in Developer Console

| Tab | Use for |
|-----|---------|
| **Skill I/O** | Type utterances directly (`what's for lunch next week`) |
| **Manual JSON** | Paste full request JSON; click **Invoke** |
| **Alexa Simulator** | Simulates real Echo routing — **often hits wrong skill** while legacy skills are live |

Enable **Skill testing in: Development** before testing.

### Manual JSON example (weekMenuIntent)

See `docs/manual-json-week-menu.example.json` or the user guide.

### Local test

```bash
cd lambda
npm install
npm test
```

---

## Certification checklist

1. **Build** → Build Model (must succeed)
2. **Distribution** → complete listing (name, description, icons, privacy)
3. **Privacy:** no personal data; public calendar only
4. **Testing instructions** for cert team (in `skill.json`)
5. **Certification** → Submit

After live: disable `0ee0c251…` and `8d9936d5…` if no longer needed.

---

## Calendar source

- **ICS:** `https://calendar.google.com/calendar/ical/christschools.org_f2uc72cd4bn3mgglvl1j49a7sk%40group.calendar.google.com/public/basic.ics`
- **Embed:** `https://calendar.google.com/calendar/embed?src=christschools.org_f2uc72cd4bn3mgglvl1j49a7sk%40group.calendar.google.com&ctz=America%2FChicago`

All-day events use UTC date parts; matching logic uses `YYYY-MM-DD` string keys and Chicago timezone for "today"/relative days.

---

## Project layout

```
lambda/
  index.js           # Skill handler
  package.json       # Dependencies
  test-menu.js       # Calendar smoke test
skill-package/
  skill.json         # Manifest (listing, endpoints)
  interactionModels/custom/en-US.json
docs/
  README.md                              # Documentation index
  USER_GUIDE.md                          # End-user documentation (comprehensive)
  DEVELOPER.md                           # Maintainer documentation
  manual-json-week-menu.example.json     # Console test example
ask-resources.json   # ASK CLI hosted-skill config
```
