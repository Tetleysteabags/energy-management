# How to use — page content

**Layout:** an accordion of short sections (tap a topic to expand), first one open
by default. Calm voice, scannable, never a wall of text — the page must follow the
same low-overhead principle as the rest of the app, because the reader is
energy-limited. Lives under **More → How to use**, and can double as a gentle
first-run intro.

Page title: **How to use this**
Subtitle: *The basics, in a minute. Tap any topic.*

---

### What this is  *(open by default)*
A private place to notice how your days affect one another — how yesterday's
activity, last night's sleep, and today's symptoms connect.

Over time it looks for *possible patterns* in your own data. It doesn't diagnose
anything, and it's just for you.

### Your daily check-ins
Two quick check-ins, about a minute total:

- **Morning** — how you're feeling.
- **Evening** — what your day was like.

Both come pre-filled with yesterday's answers, so most days you just adjust what
changed — or tap **"Same as yesterday"**. Missing a day is completely fine;
nothing breaks.

### Logging through the day
On the home screen you can tap to log a nap, walk, or meeting and set how long it
was. This is optional — the daily check-ins are the main thing.

### What it does with your data
Once there's enough data, it surfaces possible patterns — like *"busy days tend
to be followed by lower energy."*

At first you'll see **"collecting data"** — that's normal; it usually takes a few
weeks. Everything it shows is a lead to watch, never proof of cause, and it will
never tell you to do more.

### Connect your Fitbit or watch
To bring in sleep and recovery data automatically:

1. Go to **More → Wearables**.
2. Tap **Connect**.
3. Sign in with the Google account your Fitbit or Pixel Watch uses.
4. Approve read-only access to sleep, heart rate, and activity.

That's it — it syncs by itself each morning. New data can take a day to appear,
and you can disconnect any time.

### What this isn't
This isn't medical advice or a diagnosis. If you're feeling unwell or worried,
talk to a doctor.

When you want to share what you're seeing, the **Reports** page makes a clean
summary for your clinician.

---

## Notes for the build
- Accordion sections (collapsed by default except the first); tap to expand. One
  icon per section header, a chevron that rotates.
- Plain prose, short paragraphs, sentence case — no marketing tone.
- The Fitbit steps are **user-facing**: the person just taps Connect and signs in
  with Google. All the developer setup (Google Cloud project, OAuth client,
  publishing the consent screen) is invisible to them and lives in the
  implementation plan, not here.
- If the wearable isn't connected, the "Connect your Fitbit" section can show a
  one-tap shortcut straight to `/wearables`.
