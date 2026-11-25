/* Sport / Health nach dem Vorbild von MRH1 (Fitbit Air on Steroids): Werte, Scores, Panels, Trends.
   Daten: Beispieldaten oder echte Tageswerte, die per Kurzbefehl aus Apple Health eingelesen werden. */
(function () {
  "use strict";
  var C = { recovery: "#3DDC97", recoveryTrack: "#24302B", strain: "#4DA3FF", strainTrack: "#1E2A3A", sleep: "#A78BFA", sleepTrack: "#2A2540",
    warn: "#FFB454", low: "#7DBBFF", bad: "#FF6B6B", heart: "#FF6B7A", lungs: "#4DD0E1", deep: "#5B3FD1", light: "#6C8CFF", rem: "#9FD3FF", awake: "#FF8FA3" };
  var DAY = 86400000;
  var host = null, ui = { tab: "today", stack: [], sheet: null, msg: "" };

  /* ---------- Werte-Definitionen ---------- */
  var M = {
    restingHR: { name: "Ruhepuls", sub: "RHR · Herzschläge pro Minute in Ruhe", unit: "bpm", typicalText: "60 – 100 bpm (Fitte oft darunter)", typical: [45, 85], floor: 2, dir: false,
      what: "Dein niedrigster gleichmäßiger Puls, gemessen im Schlaf. Fitte Menschen liegen oft niedriger, das ist normal.",
      hi: "5+ bpm über deinem Üblichen: Stress, Alkohol, Hitze, zu wenig getrunken oder eine kommende Erkältung.", lo: "Meist ein Zeichen guter Fitness. Nur bei Schwindel oder Ohnmacht zum Arzt." },
    hrv: { name: "Herzratenvariabilität", sub: "HRV · Abstand zwischen Herzschlägen, in ms", unit: "ms", typicalText: "Sehr persönlich (20 – 100 ms)", typical: null, floor: 4, dir: true,
      what: "Die winzigen Unterschiede in der Zeit zwischen zwei Herzschlägen. Höher heißt: Dein Nervensystem ist entspannt und erholt. Vergleiche sie nur mit dir selbst.",
      hi: "Gut ausgeruht und erholt.", lo: "Stress, zu wenig Schlaf, Alkohol, Krankheit oder Übertraining." },
    sleepingHR: { name: "Puls im Schlaf", sub: "Durchschnitt in der letzten Nacht", unit: "bpm", typicalText: "50 – 75 bpm", typical: [45, 78], floor: 2, dir: false,
      what: "Dein durchschnittlicher Puls über die Nacht. Er sollte nah an deinem Ruhepuls liegen.",
      hi: "Spätes Essen, Alkohol, warmes Zimmer oder Krankheit.", lo: "Tiefer, ruhiger Schlaf." },
    breathing: { name: "Atemfrequenz", sub: "Atemzüge pro Minute im Schlaf", unit: "/min", typicalText: "12 – 20 /min", typical: [12, 20], floor: 0.6, dir: false, dec: 1,
      what: "Wie oft du pro Minute im Schlaf atmest. Der Wert schwankt kaum von Nacht zu Nacht, deshalb ist ein Sprung aussagekräftig.",
      hi: "+1 oder mehr über deinem Üblichen kann ein bis zwei Tage vor einer Erkältung auftreten. Auch Alkohol oder Hitze.", lo: "Allein selten ein Grund zur Sorge." },
    spo2: { name: "Blutsauerstoff", sub: "SpO2 · Sauerstoffsättigung im Blut", unit: "%", typicalText: "95 – 100 %", typical: [95, 100], floor: 0.8, dir: null, dec: 1,
      what: "Der Anteil deiner roten Blutkörperchen, die Sauerstoff tragen, per rotem und infrarotem Licht durch die Haut geschätzt.",
      hi: "Kein Grund zur Sorge.", lo: "Mehrere Nächte unter 93 % können Atemaussetzer im Schlaf oder Höhe bedeuten. Unter 90 %: zum Arzt." },
    skinTemp: { name: "Hauttemperatur", sub: "Abweichung von deiner üblichen Nacht, in °C", unit: "°C", typicalText: "innerhalb von ±0,5 °C deines Üblichen", typical: [-0.5, 0.5], floor: 0.25, dir: null, signed: true,
      what: "Nicht deine Körpertemperatur: der Unterschied zwischen letzter Nacht und deiner normalen Nacht, am Handgelenk gemessen.",
      hi: "Über +1 °C: Fieber, Krankheit, Alkohol oder ein warmes Zimmer.", lo: "Meist ein kühles Zimmer oder weniger Decke." },
    sleepTotal: { name: "Schlaf gesamt", sub: "Zeit, die du wirklich geschlafen hast", unit: "", typicalText: "7 – 9 Std.", typical: [420, 540], floor: 30, dir: true, minutes: true,
      what: "Schlafzeit ohne die Wachmomente im Bett.",
      hi: "Okay nach harten Tagen oder kurzen Nächten. Dauerhaft über 9 – 10 Std. mit Müdigkeit lohnt einen Check.", lo: "Unter 7 Std. baut Schlafschuld auf und senkt die Erholung von morgen." },
    deepSleep: { name: "Tiefschlaf", sub: "Slow-Wave-Schlaf · Körper repariert sich", unit: "", typicalText: "10 – 20 % der Nacht (≈ 45 – 110 Min.)", typical: [45, 110], floor: 10, dir: true, minutes: true,
      what: "Die tiefste Phase, in der sich Muskeln erholen und das Immunsystem am meisten arbeitet. Vor allem in der ersten Nachthälfte.",
      hi: "Dein Körper hat nach einem harten Tag oder kurzen Nächten aufgeholt.", lo: "Alkohol, spätes Koffein oder spätes Essen kürzen ihn oft." },
    remSleep: { name: "REM-Schlaf", sub: "Rapid Eye Movement · die Traumphase", unit: "", typicalText: "20 – 25 % der Nacht (≈ 75 – 130 Min.)", typical: [75, 135], floor: 12, dir: true, minutes: true,
      what: "Die Traumphase, wichtig für Gedächtnis und Stimmung. Länger in der zweiten Nachthälfte.",
      hi: "Häufig nach Schlafschuld (Nachholeffekt).", lo: "Alkohol und kurze Nächte kürzen REM zuerst." },
    awake: { name: "Wach in der Nacht", sub: "Aufwachen nach dem Einschlafen", unit: "", typicalText: "unter 30 – 60 Min.", typical: [0, 60], floor: 8, dir: false, minutes: true,
      what: "Gesamte Wachzeit zwischen Einschlafen und Aufstehen. Kurze Wachphasen sind normal, du erinnerst dich kaum daran.",
      hi: "Lärm, Licht, Hitze, Alkohol, Stress oder Toilettengang.", lo: "Durchgehender Schlaf." },
    steps: { name: "Schritte", sub: "Letzter Tageswert", unit: "Schritte", typicalText: "7 000 – 10 000 pro Tag", typical: [7000, 14000], floor: 1500, dir: true, group: true,
      what: "Tägliche Schritte, aus Fitbit und iPhone zusammen (Apple Health entfernt Doppelzählungen).",
      hi: "Super für die langfristige Gesundheit.", lo: "Wochenlang unter 5 000 am Tag hängt mit schlechterer Gesundheit zusammen." },
    energy: { name: "Aktive Energie", sub: "Durch Bewegung verbrannte Kalorien", unit: "kcal", typicalText: "Hängt von Körpergröße und Aktivität ab", typical: null, floor: 120, dir: true, group: true,
      what: "Kalorien, die du durch Bewegung und Sport verbrennst, zusätzlich zu dem, was dein Körper in Ruhe braucht.",
      hi: "Ein sehr aktiver Tag.", lo: "Ein ruhiger Tag." },
    workoutMinutes: { name: "Trainingszeit", sub: "Aufgezeichnetes Training, letzte 7 Tage", unit: "Min.", typicalText: "150+ Min. pro Woche moderate Belastung", typical: [150, 600], floor: 30, dir: true,
      what: "Gesamtzeit der erkannten oder eingetragenen Workouts der letzten 7 Tage.",
      hi: "Eine große Trainingswoche: achte auf deine Erholung.", lo: "Eine ruhige Woche. Ziel sind 150+ Minuten pro Woche." }
  };
  var PANELS = [
    { id: "heart", title: "Herz", short: "Herz", tint: C.heart, metrics: ["restingHR", "hrv", "sleepingHR"] },
    { id: "lungs", title: "Lunge, Sauerstoff & Temperatur", short: "Lunge", tint: C.lungs, metrics: ["breathing", "spo2", "skinTemp"] },
    { id: "sleep", title: "Schlaf", short: "Schlaf", tint: C.sleep, metrics: ["sleepTotal", "deepSleep", "remSleep", "awake"] },
    { id: "activity", title: "Aktivität & Belastung", short: "Aktivität", tint: C.strain, metrics: ["steps", "energy", "workoutMinutes"] }
  ];
  var SHORT = { restingHR: "Ruhepuls", hrv: "HRV", sleepingHR: "Schlafpuls", breathing: "Atemzüge", spo2: "Sauerstoff", skinTemp: "Haut °C", sleepTotal: "Gesamt", deepSleep: "Tief", remSleep: "REM", awake: "Wach", steps: "Schritte", energy: "Aktiv kcal", workoutMinutes: "Training 7T" };
  var FIELD = { rhr: "restingHR", hrv: "hrv", resp: "breathing", spo2: "spo2", temp: "skinTemp", sleepHr: "sleepingHR", steps: "steps", kcal: "energy", sleep: "sleepTotal", deep: "deepSleep", rem: "remSleep", awake: "awake" };

  /* ---------- Hilfen ---------- */
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
  function pad(n) { return String(n).padStart(2, "0"); }
  function dkey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dparse(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var hm = function (t) { return new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); };
  var dayName = function (d, o) { return d.toLocaleDateString("de-DE", o || { weekday: "short", day: "numeric", month: "short" }); };
  function fmt(id, v) {
    var m = M[id];
    if (m.minutes) { var t = Math.round(v); return t >= 60 ? Math.floor(t / 60) + " Std. " + pad(t % 60) : t + " Min."; }
    if (m.group) return Math.round(v).toLocaleString("de-DE");
    if (m.signed) return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",");
    return m.dec ? v.toFixed(m.dec).replace(".", ",") : String(Math.round(v));
  }
  function mean(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function stats(vals, floor) {
    if (vals.length < 3) return null;
    var m = mean(vals), sd = Math.sqrt(mean(vals.map(function (v) { return (v - m) * (v - m); })));
    return { mean: m, sd: Math.max(sd, floor) };
  }

  /* ---------- Beispieldaten (nach data.js der Vorlage) ---------- */
  function buildSample() {
    var seed = 42;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function noise(sd) { return (rnd() + rnd() + rnd() - 1.5) * sd * 1.15; }
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var days = []; for (var i = 30; i >= 0; i--) days.push(new Date(today.getTime() - i * DAY));
    function series(base, sd, ov) {
      return days.map(function (d, i) { var fe = days.length - 1 - i; return { date: d, value: ov && ov[fe] !== undefined ? ov[fe] : base + noise(sd) }; });
    }
    var data = {
      restingHR: series(61, 1.6, { 0: 60, 1: 62, 2: 64.5, 3: 61, 4: 60, 5: 59, 6: 61 }),
      hrv: series(50, 5, { 0: 56, 1: 52, 2: 41, 3: 49, 4: 53, 5: 55, 6: 51 }),
      breathing: series(14.8, 0.35, { 0: 15.9, 1: 14.9, 2: 15.1, 3: 14.6, 4: 14.7, 5: 14.8, 6: 14.5 }),
      spo2: series(96.4, 0.5, { 0: 96.6, 3: 94.9 }),
      skinTemp: series(0, 0.18, { 0: 0.2, 2: 0.4 }),
      sleepingHR: series(56, 1.6, { 0: 55, 2: 59 }),
      steps: series(8900, 2100, { 0: 9420, 1: 12850, 2: 6120, 3: 10340, 4: 8770, 5: 11400, 6: 7930 }),
      energy: series(690, 140, { 0: 720, 1: 980, 2: 470, 3: 760 }),
      workoutMinutes: series(190, 30, { 0: 212, 1: 205, 2: 180 })
    };
    function makeNight(fromEnd, asleep, deep, rem, awake, bh, bm) {
      var wake = days[days.length - 1 - fromEnd], start = new Date(wake.getTime() - DAY); start.setHours(bh, bm, 0, 0);
      var light = asleep - deep - rem, segs = [], t = start.getTime(), cycles = Math.max(4, Math.round(asleep / 90));
      var dP = [0.34, 0.28, 0.2, 0.1, 0.05, 0.03], rP = [0.08, 0.14, 0.18, 0.2, 0.2, 0.2];
      var sD = dP.slice(0, cycles).reduce(function (a, b) { return a + b; }, 0), sR = rP.slice(0, cycles).reduce(function (a, b) { return a + b; }, 0);
      function add(stage, min) { if (min > 1) { segs.push({ stage: stage, start: t, end: t + min * 60000 }); t += min * 60000; } }
      for (var c = 0; c < cycles; c++) {
        var d = deep * (dP[c] || 0.02) / sD, r = rem * (rP[c] || 0.2) / sR, l = light / cycles;
        add("light", l * 0.55); add("deep", d); add("light", l * 0.45); add("rem", r);
        if (c < cycles - 1 && awake > 0) add("awake", awake / (cycles - 1));
      }
      return { start: start.getTime(), end: t, segments: segs, asleep: asleep, deep: deep, rem: rem, awake: awake, date: new Date(new Date(t).setHours(0, 0, 0, 0)) };
    }
    var plan = [[418, 68, 88, 34, 23, 40], [455, 80, 97, 28, 23, 5], [402, 61, 79, 41, 0, 25], [470, 84, 104, 26, 22, 55], [436, 72, 93, 30, 23, 30], [389, 58, 72, 46, 0, 50],
      [481, 86, 108, 22, 22, 45], [445, 77, 95, 29, 23, 20], [428, 70, 90, 33, 23, 50], [396, 55, 70, 52, 1, 5], [462, 81, 102, 27, 23, 0], [451, 79, 99, 31, 23, 15], [438, 74, 96, 35, 23, 25], [432, 82, 101, 31, 23, 35]];
    var nights = plan.map(function (p, i) { return makeNight(plan.length - 1 - i, p[0], p[1], p[2], p[3], p[4], p[5]); });
    data.sleepTotal = nights.map(function (n) { return { date: n.date, value: n.asleep }; });
    data.deepSleep = nights.map(function (n) { return { date: n.date, value: n.deep }; });
    data.remSleep = nights.map(function (n) { return { date: n.date, value: n.rem }; });
    data.awake = nights.map(function (n) { return { date: n.date, value: n.awake }; });
    var hr = [];
    for (var m = 7 * 60; m <= 17 * 60 + 40; m += 2) {
      var base = 66 + 6 * Math.sin(m / 95);
      if (m > 12 * 60 + 10 && m < 12 * 60 + 55) base = 132 + 12 * Math.sin(m / 4);
      if (m > 9 * 60 && m < 11 * 60) base += 14;
      hr.push({ t: today.getTime() + m * 60000, bpm: base + noise(3) });
    }
    var stress = [];
    for (var h = 0; h <= 17; h++) {
      if (h < 7) stress.push({ hour: h, level: 0.2 + rnd() * 0.3 });
      else if (h === 12) stress.push({ hour: h, level: null });
      else if (h === 9 || h === 10) stress.push({ hour: h, level: 2.2 + rnd() * 0.4 });
      else if (h === 15) stress.push({ hour: h, level: 1.3 });
      else stress.push({ hour: h, level: 0.4 + rnd() * 0.5 });
    }
    return { sample: true, today: today, data: data, nights: nights, hr: hr, stress: stress, strain: 9.4, maxHR: 182, age: 38,
      zones: [64, 38, 22, 14, 3], workoutsToday: [{ name: "Lauf", start: today.getTime() + (12 * 60 + 10) * 60000, minutes: 45 }], nowLabel: "17:40",
      bodyAge: { estimate: 35.7, age: 38, factors: [
        ["Ruhepuls", -0.5, "61 bpm (14-Tage-Schnitt). Niedriger ist jünger, 60 oder weniger ist sehr gut."],
        ["Tägliche Schritte", -0.9, "9 230 pro Tag. 8 000+ am Tag hängen mit längerem Leben zusammen."],
        ["Training", -0.4, "212 Min. Workouts in 7 Tagen. Ziel sind 150+."],
        ["HRV", 0.3, "51 ms bei etwa 54 typisch für dein Alter."],
        ["Schlafdauer", -0.5, "Im Schnitt 7 Std. 15 pro Nacht. 7 – 8,5 Std. sind ideal."],
        ["Schlafregelmäßigkeit", -0.3, "Schlafenszeit schwankt um ±31 Min. Unter ±45 Min. hilft."]] } };
  }

  /* ---------- Echte Tageswerte (per Kurzbefehl eingelesen) ---------- */
  function buildReal(h) {
    var keys = Object.keys((h && h.days) || {}).sort();
    if (!keys.length) return null;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var data = {}, nights = [], wk = {};
    Object.keys(FIELD).forEach(function (f) {
      var s = []; keys.forEach(function (k) { var v = h.days[k][f]; if (typeof v === "number") s.push({ date: dparse(k), value: v }); });
      if (s.length) data[FIELD[f]] = s;
    });
    keys.forEach(function (k) { if (typeof h.days[k].workout === "number") wk[k] = h.days[k].workout; });
    var wkKeys = Object.keys(wk).sort();
    if (wkKeys.length) data.workoutMinutes = wkKeys.map(function (k) {
      var d = dparse(k), sum = 0; wkKeys.forEach(function (j) { var t = dparse(j).getTime(); if (t <= d.getTime() && t > d.getTime() - 7 * DAY) sum += wk[j]; });
      return { date: d, value: sum };
    });
    keys.forEach(function (k) {
      var x = h.days[k]; if (typeof x.sleep !== "number") return;
      nights.push({ end: dparse(k).getTime(), segments: [], asleep: x.sleep, deep: x.deep || 0, rem: x.rem || 0, awake: x.awake || 0, date: dparse(k), stagesKnown: typeof x.deep === "number" && typeof x.rem === "number", awakeKnown: typeof x.awake === "number" });
    });
    var last = h.days[keys[keys.length - 1]];
    var strain = null;
    if (typeof last.kcal === "number") strain = 21 * (1 - Math.exp(-(last.kcal + 5 * (last.workout || 0)) / 1100));
    return { sample: false, today: today, data: data, nights: nights, hr: null, stress: null, strain: strain, strainEst: true, zones: null, workoutsToday: null,
      count: keys.length, lastKey: keys[keys.length - 1], maxHR: 0, age: 0, bodyAge: null, nowLabel: "" };
  }

  function buildEmpty() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return { sample: false, today: today, data: {}, nights: [], hr: null, stress: null, strain: null, zones: null, workoutsToday: null, count: 0, bodyAge: null, nowLabel: "" };
  }

  /* ---------- Zustand je Wert, Scores, Verlauf ---------- */
  function makeState(DS, id) {
    var s = DS.data[id]; if (!s || !s.length) return null;
    var latest = s[s.length - 1], hist = s.slice(0, -1).map(function (p) { return p.value; });
    var baseline = stats(hist, M[id].floor), band = baseline ? [baseline.mean - baseline.sd, baseline.mean + baseline.sd] : M[id].typical;
    var flag = "normal"; if (band) flag = latest.value > band[1] ? "high" : latest.value < band[0] ? "low" : "normal";
    var dir = M[id].dir, concern = flag !== "normal" && (dir === null || (flag === "high") !== dir);
    return { id: id, series: s, latest: latest, baseline: baseline, band: band, flag: flag, concern: concern, color: concern ? (flag === "high" ? C.warn : C.low) : C.recovery };
  }
  function zAt(DS, id, date, higherBetter) {
    var s = DS.data[id]; if (!s) return null;
    var idx = -1; s.forEach(function (p, i) { if (p.date.getTime() === date.getTime()) idx = i; });
    if (idx < 0) return null;
    var others = s.filter(function (_, i) { return i !== idx; }).map(function (p) { return p.value; }), b = stats(others, M[id].floor);
    if (!b) return null;
    var z = (s[idx].value - b.mean) / b.sd; return Math.max(-3, Math.min(3, higherBetter ? z : -z));
  }
  function recoveryAt(DS, date) {
    var parts = [], zs = [["hrv", true, 0.40, "HRV (Herzratenvariabilität)"], ["restingHR", false, 0.25, "Ruhepuls"], ["breathing", false, 0.15, "Atemfrequenz"]];
    zs.forEach(function (q) { var z = zAt(DS, q[0], date, q[1]); if (z !== null) parts.push({ id: q[0], label: q[3], z: z, w: q[2] }); });
    var n = DS.nights.filter(function (x) { return x.date.getTime() === date.getTime(); })[0];
    if (n && n.asleep > 0) parts.push({ id: "sleepTotal", label: "Schlaf im Vergleich zum Bedarf (8 Std.)", z: Math.max(-3, Math.min(3, (n.asleep / 480 - 0.9) / 0.1)), w: 0.20, val: fmt("sleepTotal", n.asleep) });
    if (!parts.some(function (p) { return p.id === "hrv" || p.id === "restingHR"; })) return null;
    var tw = parts.reduce(function (a, p) { return a + p.w; }, 0), avg = parts.reduce(function (a, p) { return a + p.z * p.w; }, 0) / tw;
    return { score: Math.round(100 / (1 + Math.exp(-(1.2 * avg + 0.4)))), parts: parts };
  }
  function sleepScoreOf(n) {
    if (!n || n.asleep <= 60) return null;
    if (n.stagesKnown === false || n.awakeKnown === false) return null;   /* nichts raten: ohne Phasen und Wachzeit kein Score */
    var dur = Math.min(n.asleep / 480, 1) * 50, rest = Math.min(((n.deep + n.rem) / n.asleep) / 0.40, 1) * 30, eff = n.asleep / (n.asleep + n.awake);
    return Math.round(dur + rest + Math.min(eff / 0.90, 1) * 20);
  }
  function prepare() {
    var useSample = host.getSample(), DS = useSample ? buildSample() : (buildReal(host.getData()) || buildEmpty());
    var ST = {}; Object.keys(M).forEach(function (id) { var s = makeState(DS, id); if (s) ST[id] = s; });
    var lastDate = null;
    Object.keys(ST).forEach(function (id) { var d = ST[id].latest.date.getTime(); if (lastDate === null || d > lastDate) lastDate = d; });
    var today = lastDate !== null ? new Date(lastDate) : DS.today;
    var rec = recoveryAt(DS, today), night = DS.nights.length ? DS.nights[DS.nights.length - 1] : null;
    var S = { recovery: rec ? rec.score : null, sleep: sleepScoreOf(night), strain: DS.strain };
    var history = [];
    for (var d = 6; d >= 0; d--) {
      var dt = new Date(today.getTime() - d * DAY), r = recoveryAt(DS, dt), nn = DS.nights.filter(function (x) { return x.date.getTime() === dt.getTime(); })[0];
      var st = DS.data.steps ? DS.data.steps.filter(function (p) { return p.date.getTime() === dt.getTime(); })[0] : null;
      var kc = DS.data.energy ? DS.data.energy.filter(function (p) { return p.date.getTime() === dt.getTime(); })[0] : null;
      if (!r && !nn && !st) continue;
      history.push({ d: d, date: dt, recovery: r ? r.score : null, sleep: nn ? nn.asleep : null, steps: st ? st.value : null,
        strain: d === 0 && DS.strain !== null ? DS.strain : (kc ? 21 * (1 - Math.exp(-kc.value / 1100)) : null) });
    }
    return { DS: DS, ST: ST, S: S, rec: rec, night: night, history: history, today: today, real: !useSample };
  }
  var concerns = function (P) { return Object.keys(P.ST).map(function (k) { return P.ST[k]; }).filter(function (s) { return s.concern; }); };
  var panelsOf = function (P) { return PANELS.map(function (p) { return { id: p.id, title: p.title, short: p.short, tint: p.tint, metrics: p.metrics.filter(function (id) { return P.ST[id]; }) }; }).filter(function (p) { return p.metrics.length; }); };
  var recColor = function (s) { return s >= 67 ? C.recovery : s >= 34 ? C.warn : C.bad; };

  /* ---------- Bausteine ---------- */
  var WORD = { normal: "Normal", high: "Hoch", low: "Niedrig" };
  var info = '<svg class="hx-i" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
  var chev = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  function ring(p, color, track, size, w, label, delay) {
    var r = (size - w) / 2, c = 2 * Math.PI * r; p = Math.max(0, Math.min(1, p || 0));
    return '<div class="hx-ring" style="width:' + size + "px;height:" + size + 'px"><svg width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + track + '" stroke-width="' + w + '"/>' +
      '<circle class="hx-arc" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - p) + '" style="--c:' + c + ";animation-delay:" + (delay || 0) + 's" transform="rotate(-90 ' + size / 2 + " " + size / 2 + ')"/></svg><span class="hx-rlab">' + label + "</span></div>";
  }
  var pill = function (st) { return '<span class="hx-pill" style="color:' + st.color + ";background:" + st.color + '29">' + WORD[st.flag] + "</span>"; };
  function yourRange(st) {
    if (!st.baseline) return "Lernt noch (ab 3 Messungen)";
    if (st.id === "skinTemp") return "±" + st.baseline.sd.toFixed(1).replace(".", ",") + " °C";
    return fmt(st.id, st.band[0]) + " – " + fmt(st.id, st.band[1]) + (M[st.id].unit ? " " + M[st.id].unit : "");
  }
  function rangeBar(st, h) {
    h = h || 12; var v = st.latest.value, b = st.band, lo = b ? Math.min(b[0], v) : v, hi = b ? Math.max(b[1], v) : v;
    var span = Math.max(hi - lo, Math.abs(hi) * 0.1, 1); lo -= span * 0.6; hi += span * 0.6;
    var x = function (t) { return (t - lo) / (hi - lo) * 100; };
    return '<div class="hx-range" style="height:' + (h + 4) + 'px"><div class="hx-rtrack"></div>' +
      (b ? '<div class="hx-rband" style="left:' + x(b[0]) + "%;width:" + Math.max(x(b[1]) - x(b[0]), 3) + "%;height:" + h + 'px"></div>' : "") +
      '<div class="hx-rdot" style="left:calc(' + x(v) + "% - " + (h + 4) / 2 + "px);width:" + (h + 4) + "px;height:" + (h + 4) + "px;background:" + st.color + '"></div></div>';
  }
  function spark(vals, color, w, h) {
    w = w || 64; h = h || 20; if (vals.length < 2) return "<span></span>";
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), sp = Math.max(hi - lo, 0.0001);
    var pts = vals.map(function (v, i) { return (w * i / (vals.length - 1)).toFixed(1) + "," + (h * 0.05 + h * 0.9 * (1 - (v - lo) / sp)).toFixed(1); }).join(" ");
    return '<svg width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function metricRow(P, id, first) {
    var st = P.ST[id], m = M[id];
    return '<button class="hx-mrow' + (first ? "" : " sep") + '" data-hx="sheet:' + id + '" aria-label="' + esc(m.name) + ", " + fmt(id, st.latest.value) + " " + m.unit + ", " + WORD[st.flag] + '. Bedeutung anzeigen">' +
      '<div class="hx-mtop"><div><div class="hx-mname">' + m.name + '</div><div class="hx-msub">' + m.sub + '</div></div><div class="hx-mval"><span class="m v">' + fmt(id, st.latest.value) + "</span>" + (m.unit ? '<span class="hx-u">' + m.unit + "</span>" : "") + pill(st) + "</div></div>" +
      '<div class="hx-mbot">' + rangeBar(st) + spark(st.series.slice(-7).map(function (p) { return p.value; }), st.color) + info + "</div></button>";
  }
  function stageBar(n) {
    var tot = n.deep + n.rem + Math.max(n.asleep - n.deep - n.rem, 0) + n.awake; if (!tot) return "";
    var parts = [["awake", n.awake], ["rem", n.rem], ["light", Math.max(n.asleep - n.deep - n.rem, 0)], ["deep", n.deep]];
    return '<div class="hx-stagebar">' + parts.map(function (p) { return p[1] ? '<span style="flex:' + p[1] / tot + ";background:" + C[p[0]] + '"></span>' : ""; }).join("") + "</div>";
  }
  function hypnogram(n) {
    var total = n.end - n.start, row = { awake: 0, rem: 1, light: 2, deep: 3 };
    return '<svg class="hx-hyp" viewBox="0 0 320 120" preserveAspectRatio="none" aria-label="Schlafphasen in der Nacht">' +
      [0, 1, 2, 3].map(function (r) { return '<line x1="0" x2="320" y1="' + (r * 30 + 15) + '" y2="' + (r * 30 + 15) + '" stroke="#2a3a42" stroke-width="1"/>'; }).join("") +
      n.segments.map(function (s) { return '<rect x="' + (s.start - n.start) / total * 320 + '" y="' + (row[s.stage] * 30 + 5) + '" width="' + Math.max((s.end - s.start) / total * 320, 1.5) + '" height="20" rx="3" fill="' + C[s.stage] + '"/>'; }).join("") + "</svg>";
  }
  var legendSleep = '<div class="hx-legend"><i style="background:' + C.awake + '"></i>Wach <i style="background:' + C.rem + '"></i>REM <i style="background:' + C.light + '"></i>Leicht <i style="background:' + C.deep + '"></i>Tief</div>';

  /* ---------- Bildschirme ---------- */
  function greetingHtml(P) {
    var h = new Date().getHours(), g = h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
    var v = P.S.recovery === null ? "Ich lerne dich noch kennen." : P.S.recovery >= 67 ? "Du bist bereit loszulegen." : P.S.recovery >= 34 ? "Nimm es heute ruhig an." : "Dein Körper braucht Ruhe.";
    return '<div class="hx-date">' + dayName(new Date(), { weekday: "short", day: "numeric", month: "short" }).toUpperCase() + '</div><h1 class="hx-greet">' + g + ", Lucien.<br>" + v + "</h1>";
  }
  function dataCard(P) {
    var h = host.getData(), have = h && Object.keys(h.days || {}).length;
    var badge = P.real ? '<span class="hx-badge on">ECHTE DATEN · ' + P.DS.count + (P.DS.count === 1 ? " TAG" : " TAGE") + "</span>" : '<span class="hx-badge">BEISPIELZAHLEN</span>';
    var txt = P.real ? (P.DS.count ? "Zuletzt eingelesen für " + dayName(dparse(P.DS.lastKey), { weekday: "short", day: "numeric", month: "short" }) + ". " + (P.DS.count < 3 ? "Nach 3 Tagen kennt die App dein Normal und bewertet deine Werte." : "") : "Noch keine Daten eingelesen. Hier steht nur, was von deiner Fitbit kommt oder daraus berechnet wird.")
      : "Das sind erfundene Beispielwerte. Schalte oben „Beispielzahlen“ aus, um nur deine echten Daten zu sehen. Deine Fitbit synct in Apple Health, ein Kurzbefehl liest die Werte ein.";
    return '<div class="hx-card"><div class="hx-row"><b>Daten</b>' + badge + '</div><p class="hx-txt">' + txt + '</p>' +
      (ui.msg ? '<p class="hx-note" style="color:var(--amber)">' + esc(ui.msg) + "</p>" : "") +
      '<button class="hx-btn" data-hx="import">Aus Zwischenablage einlesen</button>' +
      '<button class="hx-btn ghost" data-hx="sheet:x:howto">So richtest du den Kurzbefehl ein</button>' +
      (have ? '<button class="hx-note" style="text-align:center;padding:6px" data-hx="wipe">Eigene Daten löschen</button>' : "") + "</div>";
  }
  function todayView(P) {
    var S = P.S, DS = P.DS, watch = concerns(P).length, pans = panelsOf(P);
    var vit = ["restingHR", "hrv", "breathing", "spo2", "skinTemp"].filter(function (id) { return P.ST[id]; });
    var out = greetingHtml(P);
    out += '<div class="hx-rings">' +
      '<button class="hx-ringcard" data-hx="push:score:recovery">' + ring((S.recovery || 0) / 100, S.recovery === null ? C.recoveryTrack : recColor(S.recovery), C.recoveryTrack, 88, 9, S.recovery === null ? "–" : S.recovery + "%", 0.1) + '<span class="hx-rl" style="color:' + C.recovery + '">ERHOLUNG</span></button>' +
      '<button class="hx-ringcard" data-hx="push:score:strain">' + ring((S.strain || 0) / 21, C.strain, C.strainTrack, 88, 9, S.strain === null ? "–" : S.strain.toFixed(1).replace(".", ","), 0.2) + '<span class="hx-rl" style="color:' + C.strain + '">BELASTUNG</span></button>' +
      '<button class="hx-ringcard" data-hx="push:score:sleep">' + ring((S.sleep || 0) / 100, S.sleep === null ? C.sleepTrack : C.sleep, C.sleepTrack, 88, 9, S.sleep === null ? "–" : S.sleep, 0.3) + '<span class="hx-rl" style="color:' + C.sleep + '">SCHLAF</span></button></div>';
    var tg = S.recovery === null ? null : S.recovery >= 67 ? [14, 17] : S.recovery >= 34 ? [10, 14] : [5, 10];
    if (S.strain !== null && tg) out += '<div class="hx-card"><div class="hx-row"><b>Belastungsziel</b><span class="m dim">' + tg[0] + " – " + tg[1] + '</span></div><div class="hx-tbar"><span class="hx-tzone" style="left:' + tg[0] / 21 * 100 + "%;width:" + (tg[1] - tg[0]) / 21 * 100 + '%"></span><span class="hx-tnow" style="width:' + S.strain / 21 * 100 + '%"></span></div>' +
      '<p class="hx-txt">' + (S.strain < tg[0] ? S.strain.toFixed(1).replace(".", ",") + " bisher. " + (DS.sample ? "Eine moderate Einheit von 30–45 Min. bringt dich in die Zone." : "Mehr Bewegung bringt dich in die Zone.") : "Du bist im Zielbereich oder darüber.") + (DS.strainEst ? " Geschätzt aus deiner Aktivität." : "") + "</p></div>";
    if (DS.stress) {
      var last = DS.stress.filter(function (s) { return s.level !== null; }).slice(-1)[0].level;
      var sc = function (v) { return v >= 2 ? C.bad : v >= 1 ? C.warn : C.recovery; }, sw = function (v) { return v >= 2 ? "Hoch" : v >= 1 ? "Mittel" : "Ruhig"; }, bars = "";
      for (var h = 0; h < 24; h++) { var x = DS.stress.filter(function (s) { return s.hour === h; })[0];
        bars += !x ? '<span style="height:3px;background:rgba(255,255,255,.08)"></span>' : x.level === null ? '<span style="height:20px;background:' + C.strain + '59"></span>' : '<span style="height:' + Math.max(4, x.level / 3 * 56) + "px;background:" + sc(x.level) + '"></span>'; }
      out += '<div class="hx-card"><div class="hx-row"><b>Stress heute <button class="hx-ib" data-hx="sheet:x:stress" aria-label="Was ist Stress?">' + info + '</button></b><span><b style="color:' + sc(last) + '">' + sw(last) + '</b> <span class="m dim">· ' + last.toFixed(1).replace(".", ",") + ' / 3</span></span></div>' +
        '<div class="hx-stress">' + bars + '</div><div class="hx-axis"><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>' +
        '<div class="hx-legend"><i style="background:' + C.recovery + '"></i>Ruhig <i style="background:' + C.warn + '"></i>Mittel <i style="background:' + C.bad + '"></i>Hoch <i style="background:' + C.strain + '59"></i>In Bewegung</div></div>';
    }
    if (pans.length) out += '<button class="hx-card hx-link" data-hx="tab:panels"><div class="hx-row"><b>Körperwerte</b><b style="color:' + (watch ? C.warn : C.recovery) + '">' + (watch ? watch + " im Blick ›" : "Alles im Bereich ›") + '</b></div><div class="hx-strip">' +
      pans.map(function (p) { var c = p.metrics.map(function (id) { return P.ST[id]; }).filter(function (s) { return s.concern; })[0]; return '<div><span style="background:' + (c ? c.color : C.recovery) + '"></span><small>' + p.short + "</small></div>"; }).join("") + "</div></button>";
    if (vit.length) {
      var last7 = []; for (var i = 6; i >= 0; i--) last7.push(new Date(P.today.getTime() - i * DAY));
      var cell = function (id, d) {
        var st = P.ST[id], p = st.series.filter(function (x) { return x.date.getTime() === d.getTime(); })[0]; if (!p) return '<span class="hx-cell"></span>';
        var f = st.band ? (p.value > st.band[1] ? "high" : p.value < st.band[0] ? "low" : "normal") : "normal", dir = M[id].dir, con = f !== "normal" && (dir === null || (f === "high") !== dir);
        return '<span class="hx-cell" style="background:' + (f === "normal" || !con ? C.recovery + "59" : f === "high" ? C.warn : C.low) + '"></span>'; };
      var nm = { restingHR: "Ruhepuls", hrv: "HRV", breathing: "Atmung", spo2: "Sauerstoff", skinTemp: "Hauttemp." };
      out += '<div class="hx-card"><div class="hx-row"><b>Gesundheitsmonitor</b><b style="color:' + C.recovery + '">' + (vit.length - vit.filter(function (id) { return P.ST[id].concern; }).length) + " von " + vit.length + ' im Bereich</b></div><div class="hx-heat"><span></span>' +
        last7.map(function (d) { return "<small>" + dayName(d, { weekday: "narrow" }) + "</small>"; }).join("") +
        vit.map(function (id) { return '<button class="hx-hl" data-hx="sheet:' + id + '">' + nm[id] + " " + info + "</button>" + last7.map(function (d) { return cell(id, d); }).join(""); }).join("") +
        '</div><p class="hx-note">Jedes Feld ist eine Nacht: grün = dein üblicher Bereich, gelb = darüber, blau = darunter, grau = keine Daten.</p></div>';
    }
    if (P.night) {
      out += '<button class="hx-card hx-link" data-hx="push:score:sleep"><div class="hx-row"><b>Letzte Nacht</b><span class="m dim">' + (P.night.start ? hm(P.night.start) + " – " + hm(P.night.end) : dayName(P.night.date, { weekday: "short", day: "numeric", month: "short" })) + '</span></div><div class="hx-big"><span class="m">' + fmt("sleepTotal", P.night.asleep) + "</span> <small>geschlafen</small></div>" + (P.night.stagesKnown === false ? "" : stageBar(P.night)) + "</button>";
      var debt = DS.nights.slice(-7).reduce(function (a, n) { return a + Math.max(0, 480 - n.asleep); }, 0);
      var withTimes = DS.nights.filter(function (n) { return n.start; });
      var cons = ""; if (withTimes.length >= 3) { var mins = withTimes.slice(-14).map(function (n) { var d = new Date(n.start), m = d.getHours() * 60 + d.getMinutes(); return m < 12 * 60 ? m + 1440 : m; }), mu = mean(mins), sd = Math.sqrt(mean(mins.map(function (x) { return (x - mu) * (x - mu); }))); cons = [Math.max(0, Math.round(100 - sd * 0.8)), Math.round(sd)]; }
      out += '<div class="hx-tiles"><button class="hx-tile" data-hx="sheet:x:debt"><span class="dim">Schlafschuld ' + info + '</span><span class="m hx-tv" style="color:' + (debt > 120 ? C.warn : C.sleep) + '">' + fmt("sleepTotal", debt) + "</span><small>letzte 7 Nächte vs. 8 Std.</small></button>" +
        (cons ? '<button class="hx-tile" data-hx="sheet:x:consistency"><span class="dim">Regelmäßigkeit ' + info + '</span><span class="m hx-tv" style="color:' + C.sleep + '">' + cons[0] + '%</span><small>Schlafenszeit ±' + cons[1] + " Min.</small></button>" : "") + "</div>";
    }
    if (P.history.length) out += '<div class="hx-row hx-pad"><b>Deine Woche</b><small class="dim">wischen ‹ ›</small></div><div class="hx-week">' +
      P.history.map(function (h) { return '<div class="hx-day' + (h.d === 0 ? " now" : "") + '"><b style="color:' + (h.d === 0 ? C.recovery : "#C9CED6") + '">' + (h.d === 0 ? "Heute" : dayName(h.date, { weekday: "long", day: "numeric" })) + '</b><div class="hx-dayrow hx-dayc">' +
        ring((h.recovery || 0) / 100, h.recovery === null ? C.recoveryTrack : recColor(h.recovery), C.recoveryTrack, 54, 6, h.recovery === null ? "–" : h.recovery + "%") +
        '<div class="hx-daystats">' + (h.sleep ? '<span><i style="color:' + C.sleep + '">●</i>' + fmt("sleepTotal", h.sleep) + "</span>" : "") + (h.strain !== null ? '<span><i style="color:' + C.strain + '">●</i>' + h.strain.toFixed(1).replace(".", ",") + "</span>" : "") + (h.steps ? '<span><i>●</i>' + Math.round(h.steps).toLocaleString("de-DE") + "</span>" : "") + "</div></div></div>"; }).join("") + "</div>";
    out += dataCard(P);
    out += '<p class="hx-foot">Wellness-Schätzung vom Handgelenk, kein medizinisches Gerät.</p>';
    return out;
  }
  function headerCard(value, p, color, track, caption) { return '<div class="hx-card hx-hdr">' + ring(p, color, track, 120, 12, value) + '<p class="hx-txt">' + caption + "</p></div>"; }
  function scoreDetail(P, kind) {
    var S = P.S, DS = P.DS;
    if (kind === "recovery") {
      if (!P.rec) return headerCard("–", 0, C.recoveryTrack, C.recoveryTrack, "Noch zu wenig Daten. Sobald du mehrere Tage Ruhepuls oder HRV eingelesen hast, vergleiche ich die letzte Nacht mit deinem Normal.");
      return headerCard(S.recovery + "%", S.recovery / 100, recColor(S.recovery), C.recoveryTrack, "Wie bereit dein Körper heute ist, im Vergleich der letzten Nacht mit deinem eigenen Normal. " + (S.recovery >= 67 ? "Du bist bereit loszulegen." : S.recovery >= 34 ? "Nimm es heute ruhig an." : "Dein Körper braucht Ruhe.")) +
        '<div class="hx-card"><b>Das hat es bestimmt</b><p class="hx-note">Rechts von der Linie = besser als üblich, links = schlechter.</p>' +
        P.rec.parts.map(function (c) { var val = c.val || (P.ST[c.id] ? fmt(c.id, P.ST[c.id].latest.value) + " " + M[c.id].unit : ""); return '<button class="hx-contrib" data-hx="sheet:' + c.id + '"><div class="hx-row"><span class="dim2">' + c.label + '</span><span class="m">' + val + " " + info + '</span></div><div class="hx-zbar"><span class="mid"></span><span style="' + (c.z >= 0 ? "left:50%" : "right:50%") + ";width:" + Math.max(Math.abs(c.z) / 3 * 50, 1) + "%;background:" + (c.z >= 0 ? C.recovery : C.warn) + '"></span></div></button>'; }).join("") + "</div>";
    }
    if (kind === "strain") {
      if (S.strain === null) return headerCard("–", 0, C.strainTrack, C.strainTrack, "Noch keine Aktivitätsdaten für heute.");
      var head = headerCard(S.strain.toFixed(1).replace(".", ","), S.strain / 21, C.strain, C.strainTrack, "Die Belastung deines Herzens über den Tag, 0 – 21. Jede Stufe ist schwerer zu erreichen: 10 – 13 moderat, 14 – 17 hoch, 18+ am Limit." + (DS.strainEst ? " Hier aus Kalorien und Training geschätzt, nicht aus dem Puls." : ""));
      if (!DS.hr) return head + '<div class="hx-card"><b>Pulsverlauf und Zonen</b><p class="hx-txt">Dafür braucht es den Pulsverlauf des Tages. Der kommt erst mit der nativen iOS-App. Mit dem Kurzbefehl-Import gibt es nur Tageswerte.</p></div>';
      var pts = DS.hr, t0 = pts[0].t, t1 = pts[pts.length - 1].t, poly = pts.map(function (p) { return ((p.t - t0) / (t1 - t0) * 320).toFixed(1) + "," + (150 - (p.bpm - 50) / 110 * 150).toFixed(1); }).join(" "), mz = Math.max.apply(null, DS.zones);
      return head + '<div class="hx-card"><b>Puls heute</b><svg class="hx-hr" viewBox="0 0 320 150" preserveAspectRatio="none" aria-label="Puls heute">' +
        [70, 100, 130].map(function (b) { return '<line x1="0" x2="320" y1="' + (150 - (b - 50) / 110 * 150) + '" y2="' + (150 - (b - 50) / 110 * 150) + '" stroke="#2a3a42"/><text x="318" y="' + (147 - (b - 50) / 110 * 150) + '" text-anchor="end" fill="#9AA3AE" font-size="9">' + b + "</text>"; }).join("") +
        '<polyline points="' + poly + '" fill="none" stroke="' + C.strain + '" stroke-width="1.6"/></svg><div class="hx-axis"><span>07:00</span><span>12:00</span><span>' + DS.nowLabel + '</span></div></div>' +
        '<div class="hx-card"><b>Zeit in den Pulszonen</b><p class="hx-note">Zonen sind % deines Maximalpulses (' + DS.maxHR + " bpm, aus deinem Alter).</p>" +
        DS.zones.map(function (z, i) { return '<div class="hx-zone"><span class="m">Z' + (i + 1) + " · " + (50 + i * 10) + '%+</span><span class="hx-zb"><i style="width:' + Math.max(z / mz * 100, 2) + "%;background:" + C.strain + ";opacity:" + (0.35 + i * 0.15) + '"></i></span><span class="m">' + z + " Min.</span></div>"; }).join("") + "</div>" +
        '<div class="hx-card"><b>Workouts heute</b>' + DS.workoutsToday.map(function (w) { return '<div class="hx-row"><span>' + w.name + '</span><span class="m dim">' + hm(w.start) + " · " + w.minutes + " Min.</span></div>"; }).join("") + "</div>";
    }
    if (!P.night) return headerCard("–", 0, C.sleepTrack, C.sleepTrack, "Noch keine Schlafdaten eingelesen.");
    if (S.sleep === null) return headerCard("–", 0, C.sleepTrack, C.sleepTrack, fmt("sleepTotal", P.night.asleep) + " geschlafen. Für den Schlafscore brauche ich auch Tief-, REM-Schlaf und Wachzeit.") + '<div class="hx-card hx-rows">' + ["sleepTotal", "deepSleep", "remSleep", "awake"].filter(function (id) { return P.ST[id]; }).map(function (id, i) { return metricRow(P, id, i === 0); }).join("") + "</div>";
    var n = P.night, inBed = n.asleep + n.awake;
    return headerCard(S.sleep, S.sleep / 100, C.sleep, C.sleepTrack, fmt("sleepTotal", n.asleep) + " geschlafen" + (n.start ? ", " + hm(n.start) + " – " + hm(n.end) : "") + (n.awake ? ". " + Math.round(n.asleep / inBed * 100) + " % deiner Zeit im Bett war Schlaf." : ".")) +
      (n.segments.length ? '<div class="hx-card"><b>Deine Nacht</b>' + hypnogram(n) + legendSleep + "</div>" : "") +
      '<div class="hx-card hx-rows">' + ["sleepTotal", "deepSleep", "remSleep", "awake"].filter(function (id) { return P.ST[id]; }).map(function (id, i) { return metricRow(P, id, i === 0); }).join("") + "</div>";
  }
  function panelsView(P) {
    var all = Object.keys(P.ST).map(function (k) { return P.ST[k]; }), ok = all.filter(function (s) { return !s.concern; }).length;
    if (!all.length) return '<h1 class="hx-large">Körperwerte</h1><div class="hx-card"><p class="hx-txt">Noch keine Werte. Lies auf der Startseite Daten ein oder schau dir die Beispieldaten an.</p></div>';
    return '<h1 class="hx-large">Körperwerte</h1><p class="hx-sum" style="color:' + (ok === all.length ? C.recovery : C.warn) + '">' + ok + " von " + all.length + " Werten normal oder besser als üblich</p>" +
      panelsOf(P).map(function (p) { var sts = p.metrics.map(function (id) { return P.ST[id]; }), o = sts.filter(function (s) { return s.concern; }).length;
        return '<button class="hx-card hx-link" data-hx="push:panel:' + p.id + '"><div class="hx-row"><b><i class="hx-dot" style="background:' + p.tint + '"></i>' + p.title + '</b><b style="color:' + (o ? C.warn : C.recovery) + ';font-size:12px">' + (o ? o + " im Blick ›" : "Alles normal ›") + '</b></div>' +
          '<div class="hx-pgrid" style="grid-template-columns:repeat(' + sts.length + ',1fr)">' + sts.map(function (s) { return '<div><span style="background:' + s.color + '"></span><b class="m" style="color:' + (s.concern ? s.color : "#fff") + '">' + fmt(s.id, s.latest.value) + "</b><small>" + SHORT[s.id] + "</small></div>"; }).join("") + "</div></button>"; }).join("") +
      '<p class="hx-note">Tippe auf eine Gruppe, um jeden Wert mit seiner Bedeutung zu sehen.</p>';
  }
  function panelDetail(P, pid) {
    var p = panelsOf(P).filter(function (x) { return x.id === pid; })[0]; if (!p) return "";
    var o = p.metrics.filter(function (id) { return P.ST[id].concern; }).length;
    return '<h1 class="hx-large">' + p.title + '</h1><p class="hx-sum" style="color:' + (o ? C.warn : C.recovery) + '">' + (o ? o + " von " + p.metrics.length + " im Blick" : "Alle " + p.metrics.length + " Werte normal oder besser als üblich") + "</p>" +
      '<div class="hx-card hx-rows">' + p.metrics.map(function (id, i) { return metricRow(P, id, i === 0); }).join("") + '</div><p class="hx-note">Gestrichelte Zone = dein Normalbereich (letzte 30 Tage). Linie = letzte 7 Tage. Tippe auf einen Wert für die Bedeutung.</p>';
  }
  function trendOf(P, id) {
    if (!P.ST[id]) return null;
    var v = P.ST[id].series.map(function (p) { return p.value; }), r = v.slice(-7), p = v.slice(-14, -7);
    if (p.length < 3 || r.length < 3) return null;
    var ra = mean(r), pa = mean(p), diff = ra - pa, pct = pa ? Math.abs(diff / pa) * 100 : 0, m = M[id];
    var f = function (x) { return fmt(id, Math.abs(x)) + (m.unit ? " " + m.unit : ""); };
    var sentence = pct < 3 ? m.name + " ist stabil: im Schnitt " + f(ra) + ", wie in der Woche davor." : m.name + " ist " + (diff > 0 ? "gestiegen" : "gesunken") + " um " + f(diff) + " (" + Math.round(pct) + " %) gegenüber der Vorwoche: im Schnitt " + f(ra) + ".";
    return { id: id, r: r, p: p, ra: ra, pa: pa, pct: pct, sentence: sentence, good: pct < 3 || m.dir === null ? null : (diff > 0) === m.dir };
  }
  function trendsView(P) {
    var order = ["restingHR", "hrv", "breathing", "sleepTotal", "deepSleep", "remSleep", "steps", "energy", "workoutMinutes", "spo2"];
    var list = order.map(function (id) { return trendOf(P, id); }).filter(Boolean), DS = P.DS, out = '<h1 class="hx-large">Trends</h1>';
    var h7 = P.history, avg = function (k) { var a = h7.map(function (h) { return h[k]; }).filter(function (x) { return x !== null && x !== undefined; }); return a.length ? mean(a) : null; };
    var rA = avg("recovery"), sA = avg("sleep"), stA = avg("steps"), debt = DS.nights.slice(-7).reduce(function (a, n) { return a + Math.max(0, 480 - n.asleep); }, 0);
    var wkS = P.ST.workoutMinutes ? P.ST.workoutMinutes.latest.value : null;
    var best = list.filter(function (t) { return t.good === true; }).sort(function (a, b) { return b.pct - a.pct; })[0];
    out += '<div class="hx-card"><div class="hx-row"><b>Wochenbericht</b><span class="m dim">' + dayName(new Date(P.today.getTime() - 6 * DAY), { day: "numeric", month: "short" }) + " – " + dayName(P.today, { day: "numeric", month: "short" }) + '</span></div><div class="hx-stats">' +
      (rA !== null ? '<div><small>Ø Erholung</small><b class="m" style="color:' + C.recovery + '">' + Math.round(rA) + "%</b></div>" : "") + (sA !== null ? '<div><small>Ø Schlaf</small><b class="m" style="color:' + C.sleep + '">' + fmt("sleepTotal", sA) + "</b></div>" : "") +
      (DS.nights.length ? '<div><small>Schlafschuld</small><b class="m" style="color:' + C.warn + '">' + fmt("sleepTotal", debt) + "</b></div>" : "") + (stA !== null ? '<div><small>Ø Schritte</small><b class="m" style="color:' + C.strain + '">' + Math.round(stA).toLocaleString("de-DE") + "</b></div>" : "") +
      (wkS !== null ? '<div><small>Training</small><b class="m" style="color:' + C.recovery + '">' + Math.round(wkS) + " Min.</b></div>" : "") + "</div>" +
      (best ? '<div class="hx-hl2"><b style="color:' + C.recovery + '">BESTE VERÄNDERUNG</b><p>' + best.sentence + "</p></div>" : "") +
      (DS.nights.length ? '<div class="hx-hl2"><b style="color:' + C.warn + '">DARAN ARBEITEN</b><p>' + (debt > 120 ? "Die Schlafschuld liegt bei " + fmt("sleepTotal", debt) + " über 7 Nächte. 30 Min. früher ins Bett würde das meiste ausgleichen." : "Beim Schlaf läuft es gut, keine nennenswerte Schlafschuld.") + "</p></div>" : "") + "</div>";
    var b = DS.bodyAge;
    if (b) out += '<div class="hx-card"><div class="hx-row"><b>Körperalter <button class="hx-ib" data-hx="sheet:x:bodyage" aria-label="Was ist das Körperalter?">' + info + '</button></b></div><div class="hx-big"><span class="m" style="color:' + C.recovery + ';font-size:40px">' + b.estimate.toFixed(1).replace(".", ",") + "</span> <small>statt " + b.age + ' nach dem Kalender</small></div>' +
      '<p class="hx-txt"><b>Deine Gewohnheiten wirken ' + (b.age - b.estimate).toFixed(1).replace(".", ",") + " Jahre jünger als dein Alter.</b></p>" +
      b.factors.slice().sort(function (x, y) { return Math.abs(y[1]) - Math.abs(x[1]); }).map(function (f) { return '<div class="hx-factor"><div class="hx-row"><b>' + f[0] + '</b><span class="m" style="color:' + (f[1] <= 0 ? C.recovery : C.warn) + '">' + (f[1] > 0 ? "+" : "") + f[1].toFixed(1).replace(".", ",") + " J.</span></div><small>" + f[2] + "</small></div>"; }).join("") + "</div>";
    if (!list.length) return out + '<div class="hx-card"><p class="hx-txt">Für Trends brauche ich mindestens 6 Tage Daten, damit ich die letzte Woche mit der davor vergleichen kann.</p></div>';
    out += '<p class="hx-note">Letzte 7 Tage im Vergleich zu den 7 davor.</p>';
    list.forEach(function (t) {
      var col = t.good === null ? C.strain : t.good ? C.recovery : C.warn, all = t.p.concat(t.r), lo = Math.min.apply(null, all.concat([0])), hi = Math.max.apply(null, all);
      out += '<button class="hx-card hx-link" data-hx="sheet:' + t.id + '"><div class="hx-row"><b style="color:' + col + ';font-size:11px;letter-spacing:.08em">' + M[t.id].name.toUpperCase() + "</b><span>" + (t.good === null ? "" : '<b style="color:' + col + '">' + (t.good ? "↗" : "↘") + "</b>") + " " + info + '</span></div><p class="hx-txt s">' + t.sentence + '</p><div class="hx-tbars">' +
        all.map(function (v, i) { return '<span style="height:' + Math.max((v - lo) / ((hi - lo) || 1) * 50, 4) + "px;background:" + (i < t.p.length ? "#2d3b43" : col) + '"></span>'; }).join("") + '</div><div class="hx-row m" style="font-size:11px"><span class="dim">Woche davor: ' + fmt(t.id, t.pa) + '</span><span style="color:' + col + '">Letzte 7 Tage: ' + fmt(t.id, t.ra) + "</span></div></button>";
    });
    return out;
  }
  function guideView() {
    var g = function (t, d) { return '<div class="hx-g"><b>' + t + "</b><p>" + d + "</p></div>"; };
    return '<h1 class="hx-large">Werte-Guide</h1><h3>Scores</h3><div class="hx-card">' +
      g("Erholung", "0 – 100 %. Wie bereit dein Körper heute ist, aus HRV, Ruhepuls, Atemfrequenz und Schlaf, jeweils im Vergleich zu deinem eigenen Normal. Grün 67+, gelb 34 – 66, rot unter 34.") +
      g("Belastung", "0 – 21. Die Belastung deines Herzens über den ganzen Tag, aus dem Puls. Jede Stufe ist schwerer zu erreichen: 10 – 13 moderat, 14 – 17 hoch, 18+ am Limit. Ohne Pulsverlauf wird sie aus aktiven Kalorien und Training geschätzt.") +
      g("Schlafscore", "0 – 100. Schlafzeit gegenüber 8 Std. Bedarf (50 Punkte), Anteil Tief- plus REM-Schlaf (30 Punkte) und wie viel der Zeit im Bett du geschlafen hast (20 Punkte).") +
      g("Stress", "0 – 3, Stunde für Stunde. Puls über deinem Ruhepuls, während du still bist. Stunden mit Bewegung zählen nicht.") + "</div>" +
      panelsOfAll().map(function (p) { return "<h3>" + p.title + '</h3><div class="hx-card">' + p.metrics.map(function (id) { return g(M[id].name + " · " + M[id].sub, M[id].what + " Typisch für Erwachsene: " + M[id].typicalText + "."); }).join("") + "</div>"; }).join("") +
      '<h3>Farben</h3><div class="hx-card">' + g("Grün · Normal", "Im üblichen Bereich (dein Durchschnitt ± eine übliche Tagesschwankung).") + g("Gelb · Hoch", "Über deinem üblichen Bereich, in der Richtung, auf die es ankommt.") + g("Blau · Niedrig", "Unter deinem üblichen Bereich, in der Richtung, auf die es ankommt.") + g("Grün · Hoch oder niedrig", "Außerhalb deines Bereichs, aber in die gute Richtung (zum Beispiel höhere HRV). Das zählt nicht als Warnung.") + "</div>" +
      '<p class="hx-foot">Wellness-Schätzung vom Handgelenk, kein medizinisches Gerät.</p>';
  }
  function panelsOfAll() { return PANELS; }

  /* ---------- Sheets ---------- */
  var EXPLAIN = {
    stress: ["Stress (0 – 3)", "Die Stressreaktion deines Körpers, Stunde für Stunde", "Wenn dein Herz im Sitzen schneller schlägt als in Ruhe, ist das meist eine Reaktion deines Nervensystems auf Stress, Koffein, eine Mahlzeit oder Krankheit. Gemessen wird dieser Abstand jede Stunde. Stunden mit Gehen oder Sport zählen nicht.",
      [["0 – 1 · Ruhig", "Nah an deinem Ruhepuls."], ["1 – 2 · Mittel", "Erhöht im Sitzen: ein voller Tag, Kaffee, eine Mahlzeit."], ["2 – 3 · Hoch", "Stark erhöht im Sitzen: Stress, Krankheit, Alkohol am Vorabend."]]],
    debt: ["Schlafschuld", "Wie viel Schlaf dir diese Woche fehlt", "Für jede der letzten 7 Nächte wird gezählt, wie weit du unter 8 Std. Bedarf lagst. Nächte über 8 Std. gleichen keine Schuld aus. Schuld macht müde und senkt die Erholung, das Aufholen braucht ein paar längere Nächte, nicht eine.",
      [["Unter 1 Std.", "Alles gut."], ["1 – 3 Std.", "Spürbar: geh früher ins Bett."], ["Über 3 Std.", "Deutlich: erwarte weniger Erholung und Fokus."]]],
    consistency: ["Schlafregelmäßigkeit", "Wie regelmäßig deine Schlafenszeit ist", "Die Streuung deiner Schlafenszeiten der letzten 2 Wochen. Zu ähnlichen Zeiten ins Bett zu gehen hält deine innere Uhr stabil und verbessert die Schlafqualität, auch bei gleicher Dauer.",
      [["±30 Min. oder weniger", "Sehr regelmäßig (80 %+)."], ["±30 – 60 Min.", "Okay."], ["Mehr als ±60 Min.", "Unregelmäßig: wie ein leichter Jetlag jede Woche."]]],
    bodyage: ["Körperalter", "Ein grobes „Fitnessalter“ aus Gewohnheiten und Werten", "Ruhepuls, HRV, tägliche Schritte, Schlafdauer und -regelmäßigkeit und Training hängen in Studien damit zusammen, wie schnell Menschen altern. Es startet bei deinem echten Alter und zieht für jeden Punkt Jahre ab oder addiert sie. Eine motivierende Schätzung, keine medizinische Aussage.",
      [["Minus-Jahre", "Besser als typisch für dein Alter."], ["Plus-Jahre", "Hier ist Luft nach oben."], ["Veränderung", "Bewegt sich über Wochen, nicht Tage."]]]
  };
  function sheetBody(P, key) {
    if (key.indexOf("x:") === 0) {
      var k = key.slice(2);
      if (k === "howto") return '<h2 class="hx-large" style="font-size:26px">Kurzbefehl einrichten</h2><p class="hx-txt">Deine Fitbit schreibt über Google Health in Apple Health. Ein Kurzbefehl holt von dort die Tageswerte und legt sie als Text in die Zwischenablage. Die App liest den Text ein. Pro Tag wird ein Eintrag gespeichert, so entsteht dein Verlauf.</p>' +
        '<div class="hx-box"><b class="dim">1 · KURZBEFEHL BAUEN</b><p>In der App Kurzbefehle: „Health-Samples suchen“ für jeden Wert (Ruhepuls, HRV, Atemfrequenz, Blutsauerstoff, Schritte, aktive Energie, Schlaf), jeweils „letzter Wert“ oder „Summe“ von heute. Dann eine Aktion „Text“ und „In Zwischenablage kopieren“.</p></div>' +
        '<div class="hx-box"><b class="dim">2 · SO SIEHT DER TEXT AUS</b><p class="hx-code">rhr=58;hrv=52;resp=14,8;spo2=96;steps=8420;kcal=640;workout=35;sleep=432;deep=78;rem=96;awake=30</p></div>' +
        '<div class="hx-box"><b class="dim">3 · WERTE UND EINHEITEN</b><p>rhr, sleepHr: bpm · hrv: ms · resp: Atemzüge/Min. · spo2: % · temp: °C Abweichung · steps: Schritte · kcal: aktive Energie · workout: Trainingsminuten heute · sleep, deep, rem, awake: Minuten (oder sleeph, deeph, remh, awakeh in Stunden). Alle Felder sind freiwillig. Mit date=2026-11-25 kannst du einen anderen Tag angeben.</p></div>' +
        '<div class="hx-box"><b class="dim">4 · EINLESEN</b><p>Führe den Kurzbefehl aus (am besten täglich als Automation am Morgen), öffne die App und tippe auf „Aus Zwischenablage einlesen“. iOS fragt einmal, ob die App einfügen darf.</p></div>' +
        '<p class="hx-tiny">Erholung braucht 3+ Tage HRV oder Ruhepuls, damit die App dein Normal kennt. Pulsverlauf, Stress und Schlafphasen kommen erst mit der nativen iOS-App.</p>';
      var e = EXPLAIN[k];
      return "<h2 class=\"hx-large\" style=\"font-size:26px\">" + e[0] + '</h2><p class="dim">' + e[1] + '</p><p class="hx-txt">' + e[2] + "</p>" + e[3].map(function (r) { return '<div class="hx-box hx-row2"><b>' + r[0] + "</b><p>" + r[1] + "</p></div>"; }).join("") + '<p class="hx-tiny">Wellness-Schätzung vom Handgelenk, kein medizinischer Test.</p>';
    }
    var st = P.ST[key], m = M[key]; if (!st) return "";
    var pts = st.series.slice(-14), vals = pts.map(function (p) { return p.value; }), lo = Math.min.apply(null, vals.concat(st.band ? [st.band[0]] : [])), hi = Math.max.apply(null, vals.concat(st.band ? [st.band[1]] : []));
    var padv = (hi - lo) * 0.15 || 1, y = function (v) { return 150 - ((v - (lo - padv)) / ((hi + padv) - (lo - padv))) * 150; }, x = function (i) { return 10 + i * (300 / Math.max(pts.length - 1, 1)); };
    var col = function (v) { return !st.band ? C.recovery : v > st.band[1] ? (m.dir === true ? C.recovery : C.warn) : v < st.band[0] ? (m.dir === true ? C.low : m.dir === false ? C.recovery : C.low) : C.recovery; };
    return '<div class="hx-shead"><div><h2>' + m.name + '</h2><p class="dim">' + m.sub + '</p></div><div class="hx-sval"><span class="m">' + fmt(key, st.latest.value) + "</span> <small>" + m.unit + "</small><br>" + pill(st) + "</div></div>" + rangeBar(st, 14) +
      '<div class="hx-boxes"><div class="hx-box"><b style="color:' + C.recovery + '">DEIN BEREICH</b><p>' + yourRange(st) + '</p></div><div class="hx-box"><b class="dim">TYPISCH ERWACHSENE</b><p>' + m.typicalText + "</p></div></div>" +
      '<p class="hx-txt">' + m.what + '</p><div class="hx-boxes"><div class="hx-box"><b style="color:' + C.warn + '">WENN HÖHER</b><p>' + m.hi + '</p></div><div class="hx-box"><b style="color:' + C.low + '">WENN NIEDRIGER</b><p>' + m.lo + "</p></div></div>" +
      '<div class="hx-box hx-chart"><div class="hx-row"><b>Verlauf · ' + pts.length + ' Tage</b><span class="dim" style="font-size:11px">Punkt antippen</span></div><svg viewBox="0 0 320 160" class="hx-tchart" aria-label="' + esc(m.name) + ' im Verlauf">' +
      (st.band ? '<rect x="0" y="' + y(st.band[1]) + '" width="320" height="' + (y(st.band[0]) - y(st.band[1])) + '" fill="#3DDC971F"/>' : "") +
      '<polyline points="' + pts.map(function (p, i) { return x(i) + "," + y(p.value); }).join(" ") + '" fill="none" stroke="#9AA3AE99" stroke-width="2"/>' +
      pts.map(function (p, i) { return '<circle class="hx-pt" data-hx="pt:' + i + '" cx="' + x(i) + '" cy="' + y(p.value) + '" r="' + (i === pts.length - 1 ? 6 : 5) + '" fill="' + col(p.value) + '"/>'; }).join("") + '</svg><p class="hx-note" id="hxTip">Grüne Zone = dein Normalbereich.</p></div>' +
      '<p class="hx-tiny">Wellness-Schätzung vom Handgelenk, kein medizinischer Test.</p>';
  }

  /* ---------- Einbindung in die App ---------- */
  var TABS = [["today", "Heute", '<circle cx="12" cy="12" r="3.5"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4"/>'], ["panels", "Werte", '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>'],
    ["trends", "Trends", '<path d="M3 17l6-6 4 4 8-8M14 7h7v7"/>'], ["guide", "Guide", '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8M8 11h6"/>']];
  function layer() {
    var l = document.getElementById("hxLayer");
    if (!l) { l = document.createElement("div"); l.id = "hxLayer"; l.className = "hx"; l.style.cssText = "display:block;padding:0"; document.body.appendChild(l); }
    return l;
  }
  function paintSheet(P) {
    var l = layer();
    if (!ui.sheet) { l.innerHTML = ""; return; }
    l.innerHTML = '<div class="hx-scrim" data-hx="close"></div><div class="hx-sheet" role="dialog" aria-modal="true"><div class="hx-grab"></div><div class="hx-sbody">' + sheetBody(P, ui.sheet) + "</div></div>";
  }
  var api = {
    init: function (h) { host = h; },
    /* liefert den Inhalt für die Seite; die App setzt Titel und Unterzeile */
    view: function () {
      var P = prepare(), top = ui.stack[ui.stack.length - 1], html, title = "Sport / Health", eyebrow = P.real ? "Echte Daten" : "Beispielzahlen";
      if (top) {
        var kn = top.split(":"), body = kn[0] === "score" ? scoreDetail(P, kn[1]) : panelDetail(P, kn[1]);
        html = '<button class="hx-back" data-hx="back">' + chev + " Zurück</button>" + body;
      } else html = { today: todayView, panels: panelsView, trends: trendsView, guide: guideView }[ui.tab](P);
      paintSheet(P);
      var tog = '<button class="hx-tog" type="button" role="switch" aria-checked="' + !P.real + '" data-hx="toggle"><span>Beispielzahlen<small>' + (P.real ? "Aus: nur echte Daten" : "An: erfundene Testwerte") + '</small></span><span class="hx-sw" aria-hidden="true"></span></button>';
      return { title: title, eyebrow: eyebrow, html: '<div class="hx">' + tog + html + "</div>", tab: ui.tab };
    },
    tabsHtml: function () {
      return TABS.map(function (t) { return '<button class="tab" type="button" data-hx="tab:' + t[0] + '"' + (ui.tab === t[0] && !ui.stack.length ? ' aria-current="page"' : "") + '><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + t[2] + "</svg>" + t[1] + "</button>"; }).join("");
    },
    open: function () { return !!ui.sheet; },
    leave: function () { ui.sheet = null; ui.stack = []; var l = document.getElementById("hxLayer"); if (l) l.innerHTML = ""; },
    act: function (el) {
      var a = el.getAttribute("data-hx"), P;
      if (a.indexOf("tab:") === 0) { ui.tab = a.slice(4); ui.stack = []; ui.sheet = null; host.rerender(true); }
      else if (a.indexOf("push:") === 0) { ui.stack.push(a.slice(5)); host.rerender(true); }
      else if (a === "back") { ui.stack.pop(); host.rerender(true); }
      else if (a.indexOf("sheet:") === 0) { ui.sheet = a.slice(6); host.rerender(false); }
      else if (a === "close") { ui.sheet = null; host.rerender(false); }
      else if (a.indexOf("pt:") === 0) {
        P = prepare(); var st = P.ST[ui.sheet]; if (!st) return;
        var p = st.series.slice(-14)[+a.slice(3)], tip = document.getElementById("hxTip");
        if (tip) tip.innerHTML = "<b>" + dayName(p.date) + '</b> · <span class="m">' + fmt(st.id, p.value) + " " + M[st.id].unit + "</span>";
        layer().querySelectorAll(".hx-pt").forEach(function (c) { c.removeAttribute("stroke"); }); el.setAttribute("stroke", "#fff"); el.setAttribute("stroke-width", "2");
      }
      else if (a === "toggle") { host.setSample(!host.getSample()); ui.stack = []; ui.sheet = null; host.rerender(false); }
      else if (a === "wipe") { if (window.confirm("Alle eingelesenen Gesundheitsdaten löschen?")) { host.setData(null); ui.msg = "Eigene Daten gelöscht."; host.rerender(false); } }
      else if (a === "import") {
        if (!navigator.clipboard || !navigator.clipboard.readText) { ui.msg = "Dein Browser erlaubt kein Einlesen aus der Zwischenablage."; host.rerender(false); return; }
        navigator.clipboard.readText().then(function (t) {
          var r = api.importText(t); ui.msg = r.msg; if (r.ok) host.setSample(false); host.rerender(false);
        }).catch(function () { ui.msg = "Zugriff auf die Zwischenablage nicht erlaubt. Tippe beim nächsten Mal auf „Einsetzen“."; host.rerender(false); });
      }
    },
    importText: function (txt) {
      txt = String(txt || "").trim();
      if (!txt) return { ok: false, msg: "Die Zwischenablage ist leer." };
      var fields = ["rhr", "hrv", "resp", "spo2", "temp", "sleephr", "steps", "kcal", "workout", "sleep", "deep", "rem", "awake"], out = {};
      function num(v) { var n = parseFloat(String(v).replace(/[^\d.,\-]/g, "").replace(",", ".")); return isFinite(n) ? n : null; }
      function take(src, key) {
        var o = {}, hit = 0;
        Object.keys(src).forEach(function (k0) {
          var k = k0.toLowerCase(), v = num(src[k0]); if (v === null) return;
          var hours = /h$/.test(k) && k !== "sleephr" && ["sleeph", "deeph", "remh", "awakeh"].indexOf(k) > -1; if (hours) { k = k.slice(0, -1); v = v * 60; }
          if (fields.indexOf(k) < 0) return;
          o[k === "sleephr" ? "sleepHr" : k] = v; hit++;
        });
        return hit ? o : null;
      }
      try {
        if (txt.charAt(0) === "{") {
          var j = JSON.parse(txt);
          (j.days || [j]).forEach(function (d) { var k = d.d || d.date || dkey(new Date()), o = take(d, k); var t = take(d); if (t) out[String(k)] = t; });
        } else {
          var kv = {}, dk = dkey(new Date());
          txt.split(/[;\n]+/).forEach(function (p) { var i = p.indexOf("="); if (i < 1) return; var k = p.slice(0, i).trim(), v = p.slice(i + 1).trim(); if (k.toLowerCase() === "date" || k.toLowerCase() === "d") { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) dk = v; } else kv[k] = v; });
          var t2 = take(kv); if (t2) out[dk] = t2;
        }
      } catch (e) { return { ok: false, msg: "Der Text in der Zwischenablage ist kein gültiges Format." }; }
      var keys = Object.keys(out); if (!keys.length) return { ok: false, msg: "Keine bekannten Werte gefunden. Prüfe den Text (zum Beispiel rhr=58;hrv=52)." };
      var h = host.getData() || { days: {} }; if (!h.days) h.days = {};
      keys.forEach(function (k) { h.days[k] = Object.assign(h.days[k] || {}, out[k]); });
      host.setData(h);
      return { ok: true, msg: keys.length === 1 ? "Eingelesen für " + dayName(dparse(keys[0]), { weekday: "short", day: "numeric", month: "short" }) + "." : keys.length + " Tage eingelesen." };
    }
  };
  window.Health = api;
})();
