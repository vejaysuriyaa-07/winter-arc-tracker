// Pin the zone so local-date tests are deterministic on every machine.
// Los Angeles observes DST, which is what the date tests exercise.
process.env.TZ = "America/Los_Angeles";
