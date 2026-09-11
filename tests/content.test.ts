/**
 * Content validation: events.json, verdicts.json and the briefing templates.
 *
 * The ConditionKey list is copied from src/types.ts on purpose: if a key is
 * added or renamed there, this test should be updated deliberately.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BriefingFacts, GameEvent, GameState, Verdict } from '../src/types.js';
import { briefingText, formatGbpBn, formatInt, formatPct } from '../src/ui/briefing.js';
import { holdingOutlook } from '../src/ui/components/holding.js';
import { courseMonths } from '../src/sim/pipeline.js';

const root = resolve(__dirname, '..');
const read = (p: string) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const events = read('src/data/events.json') as GameEvent[];
const verdicts = read('src/data/verdicts.json') as Verdict[];
const parameters = read('src/data/parameters.json').parameters as Record<string, { value: number; unit: string }>;

const CONDITION_KEYS = [
  'turn', 'turns_remaining', 'reserve_called_out', 'reserve_notice', 'reserve_mobilised',
  'ex_regular_recall_active', 'ex_regular_reported', 'strategic_traced', 'stop_loss', 'bill_status',
  'conscription_active', 'medical_standard', 'exemptions', 'include_women', 'willingness',
  'capacity_purchases', 'civilian_instructors', 'syllabus_compressed', 'equipment_buy_active',
  'equipment_arrived', 'holding_pool', 'conscripts_in_training', 'conscripts_trained', 'cumulative_cost',
  'cumulative_gdp_loss', 'political_capital', 'force_ready', 'force_ready_pct', 'force_quality',
  'leadership_factor', 'address_count', 'blame_count', 'spending_raised', 'callup_cap',
  'vetting_priority_months', 'vetting_relaxed_months',
];
const CONDITION_OPS = ['>=', '<=', '==', '>', '<', '!='];
const EFFECT_TYPES = [
  'pc', 'willingness', 'pool', 'pool_pct', 'reserve_arrival_shift', 'reserve_deployable_fraction_add',
  'ex_regular_ceiling_add', 'trace_strategic', 'capacity_purchases', 'capacity_multiplier',
  'leaders_spareable_add', 'medical_standard', 'exemptions', 'eligible_pool_pct', 'callup_cap',
  'vetting_priority', 'vetting_relax', 'equipment_delay',
  'cost', 'flag', 'scoring_pc_if_missed', 'end_game', 'random',
];
const POOL_KEYS = [
  'regularTrained', 'regularUntrained', 'reserveVolunteerAvailable', 'reserveVolunteerPending',
  'reserveVolunteerMobilised', 'exRegularTracked', 'exRegularReported', 'strategicUntracked',
  'strategicTraced', 'conscriptEligible', 'conscriptCalled', 'holdingPool', 'conscriptInTraining',
  'conscriptTrainedUnequipped', 'conscriptTrainedEquipped',
];
const VERDICT_VARS = [
  'target', 'ese', 'headcount', 'months', 'quality', 'leadership', 'costBn', 'gdpLossBn',
  'conscripts', 'reservists', 'regulars', 'shortfall', 'surplus',
];

type AnyEffect = Record<string, unknown> & { type: string };

function checkEffect(e: AnyEffect, where: string): void {
  expect(EFFECT_TYPES, `${where}: unknown effect type ${e.type}`).toContain(e.type);
  switch (e.type) {
    case 'pc':
      expect(typeof e.delta).toBe('number');
      expect(e.delta as number, `${where}: pc delta out of the modest range`).toBeGreaterThanOrEqual(-8);
      expect(e.delta as number, `${where}: pc delta out of the modest range`).toBeLessThanOrEqual(5);
      break;
    case 'willingness':
      expect(typeof e.delta).toBe('number');
      break;
    case 'pool':
      expect(POOL_KEYS, `${where}: bad pool`).toContain(e.pool);
      expect(typeof e.delta).toBe('number');
      break;
    case 'pool_pct':
      expect(POOL_KEYS, `${where}: bad pool`).toContain(e.pool);
      expect(Math.abs(e.pct as number), `${where}: pool_pct over 20%`).toBeLessThanOrEqual(20);
      break;
    case 'reserve_arrival_shift':
    case 'equipment_delay':
      expect(typeof e.months).toBe('number');
      break;
    case 'reserve_deployable_fraction_add':
    case 'ex_regular_ceiling_add':
    case 'capacity_purchases':
    case 'leaders_spareable_add':
    case 'scoring_pc_if_missed':
      expect(typeof e.delta).toBe('number');
      break;
    case 'capacity_multiplier':
      expect(typeof e.factor).toBe('number');
      break;
    case 'medical_standard':
      expect(['peacetime', 'relaxed', 'wartime']).toContain(e.standard);
      break;
    case 'exemptions':
      expect(['strict', 'broad', 'minimal']).toContain(e.regime);
      break;
    case 'eligible_pool_pct':
      expect(Math.abs(e.pct as number)).toBeLessThanOrEqual(20);
      break;
    case 'callup_cap':
      expect(typeof e.perMonth).toBe('number');
      expect(e.perMonth as number, `${where}: a negative ceiling is meaningless`).toBeGreaterThanOrEqual(0);
      if (e.durationMonths !== undefined) expect(e.durationMonths as number).toBeGreaterThan(0);
      break;
    case 'vetting_priority':
      expect(typeof e.military).toBe('boolean');
      break;
    case 'vetting_relax':
      expect(typeof e.relaxed).toBe('boolean');
      break;
    case 'cost':
      expect(typeof e.gbp).toBe('number');
      break;
    case 'flag':
      expect(typeof e.flag).toBe('string');
      expect(typeof e.value).toBe('boolean');
      break;
    case 'end_game':
      expect(typeof e.reason).toBe('string');
      break;
    case 'random':
      expect(e.chance as number).toBeGreaterThan(0);
      expect(e.chance as number).toBeLessThan(1);
      for (const sub of e.then as AnyEffect[]) checkEffect(sub, `${where}/then`);
      for (const sub of e.else as AnyEffect[]) checkEffect(sub, `${where}/else`);
      break;
    case 'trace_strategic':
      break;
  }
}

/** Number tokens in prose: 34,755 / £47,800 / 34% / 0.85 / 65. */
function numberTokens(text: string): { raw: string; value: number; pct: boolean }[] {
  const out: { raw: string; value: number; pct: boolean }[] = [];
  const re = /£?\d[\d,]*(?:\.\d+)?%?/g;
  for (const m of text.match(re) ?? []) {
    const pct = m.endsWith('%');
    const value = Number(m.replace(/[£,%]/g, ''));
    out.push({ raw: m, value, pct });
  }
  return out;
}

describe('events.json', () => {
  it('has 28–33 events with unique ids', () => {
    expect(events.length).toBeGreaterThanOrEqual(28);
    expect(events.length).toBeLessThanOrEqual(33);
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the ten events from the brief', () => {
    const ids = new Set(events.map((e) => e.id));
    for (const id of [
      'where_are_they', 'ninety_day_amendment', 'instructor_revolt', 'medical_scandal', 'refusal_test_case',
      'treasury_letter', 'ally_asks', 'equipment_delay', 'poll_bounce', 'reservist_employers',
    ]) {
      expect(ids.has(id), `missing ${id}`).toBe(true);
    }
  });

  it('has at least four informational events', () => {
    expect(events.filter((e) => e.choices.length === 0).length).toBeGreaterThanOrEqual(4);
  });

  it('uses only valid condition keys, ops, weights and turn ranges', () => {
    for (const e of events) {
      expect(Number.isInteger(e.weight) && e.weight >= 1 && e.weight <= 5, `${e.id}: weight`).toBe(true);
      const t = e.trigger;
      if (t.minTurn !== undefined) expect(Number.isInteger(t.minTurn)).toBe(true);
      if (t.maxTurn !== undefined) expect(Number.isInteger(t.maxTurn)).toBe(true);
      if (t.minTurn !== undefined && t.maxTurn !== undefined) expect(t.minTurn).toBeLessThanOrEqual(t.maxTurn);
      if (t.turnsRemaining !== undefined) expect(Number.isInteger(t.turnsRemaining)).toBe(true);
      for (const c of t.conditions ?? []) {
        expect(CONDITION_KEYS, `${e.id}: bad condition key ${c.key}`).toContain(c.key);
        expect(CONDITION_OPS, `${e.id}: bad op`).toContain(c.op);
        expect(typeof c.value, `${e.id}: condition value`).toBe('number');
      }
    }
  });

  it('has well-formed choices and valid, modest effects', () => {
    for (const e of events) {
      expect(typeof e.title).toBe('string');
      expect(e.text.length).toBeGreaterThan(40);
      for (const [i, c] of e.choices.entries()) {
        const where = `${e.id}/choice ${i}`;
        expect(c.label.trim().split(/\s+/).length, `${where}: label over six words`).toBeLessThanOrEqual(6);
        expect(c.summary.length, `${where}: summary`).toBeGreaterThan(10);
        expect(Array.isArray(c.effects)).toBe(true);
        for (const eff of c.effects) checkEffect(eff as unknown as AnyEffect, where);
      }
    }
  });

  it('sources every event that quotes a number, and the numbers match parameters.json', () => {
    for (const e of events) {
      const prose = [e.title, e.text, ...e.choices.map((c) => c.summary)].join(' ');
      const tokens = numberTokens(prose);
      if (tokens.length === 0) continue;
      expect(e.source, `${e.id}: quotes a number but has no source`).toBeDefined();
      const src = e.source!;
      expect(src.name.length).toBeGreaterThan(5);
      expect(src.url.startsWith('https://'), `${e.id}: source url`).toBe(true);
      expect(src.paramIds && src.paramIds.length > 0, `${e.id}: source has no paramIds`).toBe(true);
      const values: number[] = [];
      for (const id of src.paramIds!) {
        expect(parameters[id], `${e.id}: unknown paramId ${id}`).toBeDefined();
        const p = parameters[id];
        values.push(p.value);
        if (p.unit === 'ratio') values.push(Math.round(p.value * 100));
        if (p.unit === 'gbp') values.push(p.value / 1e9);
      }
      for (const t of tokens) {
        const ok = values.some((v) => Math.abs(v - t.value) < 1e-6);
        expect(ok, `${e.id}: "${t.raw}" does not match any value of ${src.paramIds!.join(', ')}`).toBe(true);
      }
    }
  });

  it('only repeats events that are recurring processes, and caps them', () => {
    // A one-off incident must not happen twice: the fire-extinguisher
    // resignation, the photographs from the barracks, the bounce attributed to
    // your address. What may repeat is parliamentary and administrative
    // routine, whose prose reads the same the second time.
    const RECURRING = ['pac_hearing', 'nato_liaison', 'opposition_motion'];
    const recurring = events.filter((e) => e.trigger.repeatable).map((e) => e.id);
    expect(recurring.sort()).toEqual([...RECURRING].sort());
    for (const e of events.filter((ev) => ev.trigger.repeatable)) {
      expect(e.trigger.cooldownMonths, `${e.id}: repeatable without a cooldown`).toBeGreaterThanOrEqual(3);
      expect(e.trigger.maxFires, `${e.id}: repeatable without a cap`).toBeGreaterThanOrEqual(2);
      expect(e.trigger.maxFires, `${e.id}: would repeat too often to read as news`).toBeLessThanOrEqual(3);
    }
  });

  it('spreads triggers across the game', () => {
    const early = events.filter((e) => (e.trigger.minTurn ?? 0) <= 2 && (e.trigger.conditions ?? []).length <= 1);
    const late = events.filter((e) => e.trigger.turnsRemaining !== undefined);
    expect(early.length).toBeGreaterThan(0);
    expect(late.length).toBeGreaterThan(0);
  });
});

describe('verdicts.json', () => {
  const MET = [true, false];
  const QUALITY = ['low', 'mid', 'high'] as const;
  const LEADERSHIP = ['broken', 'strained', 'intact'] as const;

  it('has 10–12 verdicts with unique ids and valid bands', () => {
    expect(verdicts.length).toBeGreaterThanOrEqual(10);
    expect(verdicts.length).toBeLessThanOrEqual(12);
    const ids = verdicts.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of verdicts) {
      expect([true, false, 'any']).toContain(v.met);
      expect(['low', 'mid', 'high', 'any']).toContain(v.quality);
      expect(['broken', 'strained', 'intact', 'any']).toContain(v.leadership);
      expect(v.text.split(/[.!?](\s|$)/).filter((s) => s && s.trim().length > 1).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('ends with the generic fallback and includes two resignation verdicts', () => {
    const last = verdicts[verdicts.length - 1];
    expect(last.met).toBe('any');
    expect(last.quality).toBe('any');
    expect(last.leadership).toBe('any');
    expect(last.resigned).toBeFalsy();
    expect(verdicts.filter((v) => v.resigned).length).toBe(2);
    // Resignation verdicts must precede everything they could be shadowed by.
    const firstNonResigned = verdicts.findIndex((v) => !v.resigned);
    expect(verdicts.slice(firstNonResigned).some((v) => v.resigned)).toBe(false);
  });

  it('covers every (met, quality, leadership) combination before the fallback', () => {
    const specific = verdicts.slice(0, -1).filter((v) => !v.resigned);
    for (const met of MET) {
      for (const q of QUALITY) {
        for (const l of LEADERSHIP) {
          const hit = specific.find(
            (v) => (v.met === 'any' || v.met === met) && (v.quality === 'any' || v.quality === q) && (v.leadership === 'any' || v.leadership === l),
          );
          expect(hit, `no verdict for met=${met} quality=${q} leadership=${l}`).toBeDefined();
        }
      }
    }
  });

  it('uses only VerdictVars placeholders and keeps one-liners under 90 characters', () => {
    const sample: Record<string, string> = {
      target: '25,000', ese: '11,400', headcount: '27,000', months: '12', quality: '0.42', leadership: '0.55',
      costBn: '14', gdpLossBn: '9', conscripts: '18,000', reservists: '6,500', regulars: '7,100',
      shortfall: '13,600', surplus: '0',
    };
    for (const v of verdicts) {
      for (const field of [v.text, v.oneLiner]) {
        for (const m of field.matchAll(/\{(\w+)\}/g)) {
          expect(VERDICT_VARS, `${v.id}: unknown placeholder {${m[1]}}`).toContain(m[1]);
        }
      }
      expect(v.oneLiner.length, `${v.id}: oneLiner too long`).toBeLessThanOrEqual(90);
      const filled = v.oneLiner.replace(/\{(\w+)\}/g, (_, k) => sample[k]);
      expect(filled.length, `${v.id}: filled oneLiner too long`).toBeLessThanOrEqual(90);
    }
  });
});

// ---------------------------------------------------------------------------
// Holding pool outlook
// ---------------------------------------------------------------------------

describe('holding pool outlook', () => {
  const course = courseMonths('normal');
  const shortest = courseMonths('compressed');
  const withPool = (turn: number, holdingPool: number): GameState => {
    const s = fakeState({ turn, deadlineMonths: 12 });
    return { ...s, pools: { ...s.pools, holdingPool } };
  };

  it('knows when a cohort can still graduate, and when only compression can', () => {
    // A cohort forming next month graduates `course` months later, so the last
    // useful start month is deadline − course.
    const early = holdingOutlook(withPool(1, 5000));
    expect(early.verdict).toBe('clearable');
    expect(early.startWindow).toBe(12 - course - 1);

    const late = holdingOutlook(withPool(12 - course, 5000));
    expect(late.startWindow).toBe(0);
    expect(late.verdict).toBe('compress_only');
  });

  it('says it is too late only when even the shortest course cannot finish', () => {
    const hopeless = holdingOutlook(withPool(12 - shortest, 5000));
    expect(hopeless.bestWindow).toBe(0);
    expect(hopeless.verdict).toBe('too_late');

    // One month earlier a compressed course still finishes.
    const last = holdingOutlook(withPool(11 - shortest, 5000));
    expect(last.bestWindow).toBe(1);
    expect(last.verdict).not.toBe('too_late');
  });

  it('counts only those who could start in time', () => {
    const o = holdingOutlook(withPool(1, 500_000));
    expect(o.placeable).toBe(Math.floor(o.spare * o.startWindow));
    expect(o.placeable).toBeLessThan(o.pool);
  });
});

// ---------------------------------------------------------------------------
// Briefing
// ---------------------------------------------------------------------------

function fakeState(over: Partial<GameState> = {}): GameState {
  const gauges = { forceReady: 4200, forceReadyPct: 16.8, forceQuality: 0.71, politicalCapital: 47, leadershipFactor: 1, headcountCounted: 5900 };
  return {
    version: 1,
    seed: 42,
    rngState: 42,
    difficulty: 'division',
    target: 25000,
    deadlineMonths: 12,
    turn: 3,
    over: false,
    pools: {
      regularTrained: 70000, regularUntrained: 3100, reserveVolunteerAvailable: 9000, reserveVolunteerPending: 14000,
      reserveVolunteerMobilised: 0, exRegularTracked: 34755, exRegularReported: 0, strategicUntracked: 60245,
      strategicTraced: 0, conscriptEligible: 0, conscriptCalled: 0, holdingPool: 0, conscriptInTraining: 0,
      conscriptTrainedUnequipped: 0, conscriptTrainedEquipped: 0,
    },
    trainingCohorts: [],
    trainedCohorts: [],
    reserveArrivals: [{ size: 14000, arrivalMonth: 6 }],
    reserveCalledOut: true,
    reserveNotice: 180,
    reserveDeployableFraction: 0.6,
    exRegularRecallActive: false,
    exRegularRecallMonth: 0,
    exRegularCeiling: 0.5,
    strategicTraceMonth: null,
    strategicTraceDone: false,
    stopLoss: false,
    billStatus: 'none',
    billPassesMonth: null,
    clauses: { ageBand: '18-30', includeWomen: true, medical: 'peacetime', exemptions: 'broad' },
    callupPerMonth: 0,
    callupCapPerMonth: null,
    callupCapUntil: null,
    vettingPriorityMonth: null,
    vettingRelaxedMonth: null,
    conscriptionEverActive: false,
    conscriptsCalledTotal: 0,
    eligiblePoolMultiplier: 1,
    capacityPurchases: 0,
    capacityPurchaseMonths: [],
    capacityMultiplier: 1,
    capacityMultiplierUntil: null,
    civilianInstructors: false,
    civilianInstructorsMonth: null,
    syllabus: 'normal',
    equipmentOrdered: false,
    equipmentArrivalMonth: null,
    juniorEntryTaken: false,
    leadersSpareableAdjust: 0,
    politicalCapital: 47,
    willingness: 20,
    willingnessBoosts: [],
    addressCount: 0,
    idleMonths: 0,
    blameCount: 0,
    spendingRaised: false,
    scoringPcIfMissed: 0,
    flags: {},
    firedEvents: [],
    pendingEvent: null,
    eventLog: [],
    ledger: {
      cumulativeCost: 1.2e9, cumulativeGdpLoss: 0.4e9, monthlyCost: 4e8, monthlyGdpLoss: 1.3e8,
      costBreakdown: { regularPay: 0, conscriptPay: 0, conscriptTraining: 0, reservistPay: 0, equipment: 0, capacity: 0, civilianInstructors: 0, other: 0 },
      regularOutflowToDate: 828, juniorLeadersLostToOutflow: 345, juniorLeadersDiverted: 0,
    },
    gauges,
    composition: {
      regulars: { headcount: 7000, ese: 7000 }, reservists: { headcount: 0, ese: 0 }, exRegulars: { headcount: 0, ese: 0 },
      strategic: { headcount: 0, ese: 0 }, conscripts: { headcount: 0, ese: 0 },
    },
    briefing: fakeFacts(),
    history: [],
    ...over,
  };
}

function fakeFacts(over: Partial<BriefingFacts> = {}): BriefingFacts {
  return {
    turn: 3,
    forceReadyDelta: 0,
    forceQualityDelta: 0,
    pcDelta: -1,
    pcReasons: [{ label: 'The crisis grinds on', delta: -1 }],
    arrivals: [],
    graduations: 0,
    outflow: 276,
    holdingPoolDelta: 0,
    leadershipFactor: 1,
    notes: [],
    ...over,
  };
}

describe('briefing', () => {
  it('formats numbers in the house style', () => {
    expect(formatInt(70951)).toBe('70,951');
    expect(formatInt(1234567.4)).toBe('1,234,567');
    expect(formatGbpBn(12_340_000_000)).toBe('£12.3bn');
    expect(formatGbpBn(85_000_000)).toBe('£85m');
    expect(formatPct(16.8)).toBe('17%');
  });

  it('writes a Day 0 note with the premise and the trade-trained strength', () => {
    const s = fakeState({ turn: 0 });
    const note = briefingText(s, fakeFacts({ turn: 0 }));
    expect(note.length).toBeGreaterThanOrEqual(2);
    expect(note.length).toBeLessThanOrEqual(4);
    const joined = (note.join(' ')).replace(/<[^>]+>/g, '');
    expect(joined).toContain('Article 5');
    expect(joined).toContain('25,000');
    expect(joined).toContain('12 months');
    expect(joined).toContain('70,951');
  });

  it('writes 2–4 sentences for a monthly note and mentions the changes', () => {
    const s = fakeState({ turn: 6, pools: { ...fakeState().pools, holdingPool: 4000, conscriptInTraining: 3000, conscriptTrainedUnequipped: 900 } });
    const facts = fakeFacts({
      turn: 6,
      pcDelta: -7,
      pcReasons: [{ label: 'The crisis grinds on', delta: -1 }, { label: 'Treasury pressure over cumulative cost', delta: -6 }],
      arrivals: [{ label: 'Army Reserve volunteers', count: 14000 }],
      graduations: 900,
      holdingPoolDelta: 4000,
      leadershipFactor: 0.72,
    });
    const note = briefingText(s, facts);
    expect(note.length).toBeGreaterThanOrEqual(2);
    expect(note.length).toBeLessThanOrEqual(4);
    const joined = (note.join(' ')).replace(/<[^>]+>/g, '');
    expect(joined).toMatch(/Month 6/);
    expect(joined).toMatch(/Leadership factor 0\.72|leadership factor 0\.72/);
    expect(joined).toMatch(/Political capital fell by 7/);
  });

  it('writes a final note at the deadline and on resignation', () => {
    const done = briefingText(fakeState({ turn: 12, over: true, overReason: 'deadline' }), fakeFacts({ turn: 12 }));
    expect(done.join(' ')).toMatch(/deadline|date agreed/);
    const quit = briefingText(fakeState({ turn: 5, over: true, overReason: 'resigned' }), fakeFacts({ turn: 5 }));
    expect(quit.join(' ')).toMatch(/resignation/);
    expect(quit.length).toBeLessThanOrEqual(4);
  });

  it('is deterministic and varies with the seed', () => {
    const a = briefingText(fakeState({ seed: 1 }), fakeFacts());
    const b = briefingText(fakeState({ seed: 1 }), fakeFacts());
    expect(a).toEqual(b);
    const variants = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) variants.add(briefingText(fakeState({ seed }), fakeFacts())[0]);
    expect(variants.size).toBeGreaterThan(1);
  });

  it('never calls Math.random', () => {
    const src = readFileSync(resolve(root, 'src/ui/briefing.ts'), 'utf8');
    expect(src).not.toMatch(/Math\.random/);
  });
});
