'use strict';
const pptxgen = require('pptxgenjs');
const path    = require('path');

// ── Grayscale palette (same settings as ESDM deck) ──────────────────────
const C = {
  bg:      'F7F7F7',
  primary: '111111',
  navy:    '1A1A1A',
  muted:   '888888',
  light:   'EBEBEB',
  border:  'CCCCCC',
  accent:  'E0E0E0',
  white:   'FFFFFF',
  darkbg:  '1A1A1A',
};

const pres = new pptxgen();
pres.layout  = 'LAYOUT_16x9';
pres.author  = 'Bless Elikem Krapah';
pres.subject = 'COE 576 NWS - Paper 8 Replication';
pres.title   = 'Automata-Based Protocol Bug Detection';

const W = 10, H = 5.625;

// ── Helpers ──────────────────────────────────────────────────────────────

function bgRect(slide, color) {
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: color || C.bg },
    line: { color: color || C.bg, pt: 0 }
  });
}

function headerBand(slide, text) {
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.72,
    fill: { color: C.primary },
    line: { color: C.primary, pt: 0 }
  });
  slide.addText(text, {
    x: 0.3, y: 0, w: W - 0.6, h: 0.72,
    color: C.white, fontSize: 21, bold: true, valign: 'middle'
  });
}

function footer(slide, n) {
  slide.addText(
    'COE 576 Networks & Web Security  |  Bless Elikem Krapah  |  KNUST  |  ' + n + '/13',
    { x: 0, y: H - 0.22, w: W, h: 0.22, color: C.muted, fontSize: 7, align: 'center' }
  );
}

function para(text, opts) {
  return { text: text, options: opts };
}

function codeBox(slide, text, x, y, w, h) {
  slide.addShape(pres.ShapeType.rect, {
    x: x, y: y, w: w, h: h,
    fill: { color: C.light },
    line: { color: C.border, pt: 1 }
  });
  slide.addText(text, {
    x: x + 0.12, y: y + 0.1, w: w - 0.24, h: h - 0.2,
    color: C.primary, fontSize: 9, fontFace: 'Courier New', valign: 'top'
  });
}

function card(slide, x, y, w, h, fillColor) {
  slide.addShape(pres.ShapeType.rect, {
    x: x, y: y, w: w, h: h,
    fill: { color: fillColor || C.light },
    line: { color: C.border, pt: 1 }
  });
}

function circle(slide, x, y, d, label) {
  slide.addShape(pres.ShapeType.ellipse, {
    x: x, y: y, w: d, h: d,
    fill: { color: C.primary },
    line: { color: C.primary, pt: 0 }
  });
  slide.addText(label, {
    x: x, y: y, w: d, h: d,
    color: C.white, fontSize: 18, bold: true, align: 'center', valign: 'middle'
  });
}

const RES = path.join(__dirname, '..', 'results');

// ────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Title (dark)
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s, C.darkbg);

  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 2.52, w: 9, h: 0.025,
    fill: { color: C.muted }, line: { color: C.muted, pt: 0 }
  });

  s.addText('Automata-Based Detection of\nProtocol State Machine Bugs', {
    x: 0.5, y: 0.6, w: 9, h: 1.8,
    color: C.white, fontSize: 33, bold: true, align: 'center', valign: 'middle'
  });

  s.addText('Replication of NDSS 2023, Paper #8', {
    x: 0.5, y: 2.58, w: 9, h: 0.45,
    color: C.border, fontSize: 16, align: 'center'
  });

  s.addText('Bless Elikem Krapah', {
    x: 0.5, y: 3.15, w: 9, h: 0.38,
    color: C.accent, fontSize: 15, align: 'center', bold: true
  });

  s.addText('COE 576: Networks and Web Security  |  KNUST MPhil  |  September 2026', {
    x: 0.5, y: 3.6, w: 9, h: 0.3,
    color: C.muted, fontSize: 11, align: 'center'
  });
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Paper Overview
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'Paper Overview');

  s.addText(
    '\u201cAutomata-Based Automated Detection of State Machine Bugs in Protocol Implementations\u201d',
    { x: 0.4, y: 0.82, w: 9.2, h: 0.55,
      color: C.navy, fontSize: 14.5, bold: true, italic: true }
  );
  s.addText('NDSS Symposium 2023', {
    x: 0.4, y: 1.38, w: 4, h: 0.28, color: C.muted, fontSize: 11
  });

  card(s, 0.4, 1.75, 9.2, 0.62, C.accent);
  s.addText(
    'Key claim: protocol implementation bugs can be detected automatically, in seconds, by' +
    ' intersecting a learned automata model with a small bug-pattern DFA.',
    { x: 0.55, y: 1.8, w: 8.9, h: 0.52, color: C.primary, fontSize: 11.5 }
  );

  const rows = [
    [
      { text: 'Protocol',              options: { bold: true, color: C.primary } },
      { text: 'Implementations',       options: { bold: true, color: C.primary } },
      { text: 'New bugs found',        options: { bold: true, color: C.primary } },
    ],
    ['DTLS', '9  (GnuTLS, MbedTLS, OpenSSL, WolfSSL, PionDTLS, Scandium\u2026)', '6'],
    ['SSH',  '3  (BitVise, Dropbear, OpenSSH)',                                    '1'],
  ];
  s.addTable(rows, {
    x: 0.4, y: 2.52, w: 9.2, h: 1.2,
    border:   { pt: 1, color: C.border },
    color:    C.primary,
    fontSize: 11,
    fontFace: 'Calibri',
    fill:     { color: C.white },
    align:    'left',
    valign:   'middle',
  });

  s.addText([
    para('Why this matters: finding state machine bugs in protocol servers requires expert manual', { color: C.muted, fontSize: 10 }),
    para(' analysis of learned models; this paper fully automates that step.', { color: C.muted, fontSize: 10 }),
  ], { x: 0.4, y: 3.85, w: 9.2, h: 0.28 });

  footer(s, 2);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 3 — The Problem
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'The Problem: Protocol State Machine Bugs');

  s.addText([
    para('Protocol servers behave as state machines', { fontSize: 13, bold: true, color: C.primary, paraSpaceAfter: 4 }),
    para('State machine bug: server accepts a message sequence the RFC forbids\n', { fontSize: 12, color: C.navy, paraSpaceAfter: 8 }),
    para('Real examples from the paper:', { fontSize: 12, bold: true, color: C.primary, paraSpaceAfter: 4, bullet: { indent: 12 } }),
    para('Completing mutual auth without a client certificate', { fontSize: 11, color: C.navy, bullet: { indent: 25 }, paraSpaceAfter: 2 }),
    para('Authenticating client without CertificateVerify (no key proof)', { fontSize: 11, color: C.navy, bullet: { indent: 25 }, paraSpaceAfter: 2 }),
    para('Accepting wrong message ordering (CertVer before CKE)', { fontSize: 11, color: C.navy, bullet: { indent: 25 }, paraSpaceAfter: 10 }),
    para('Prior approach: state fuzzing + manual model analysis', { fontSize: 12, bold: true, color: C.primary, paraSpaceAfter: 4 }),
    para('Limitation: model analysis is slow, error-prone, does not scale\n', { fontSize: 11, color: C.navy, paraSpaceAfter: 8 }),
    para('Paper\u2019s solution: encode bug classes as DFAs \u2192 intersect automatically', { fontSize: 12, bold: true, color: C.primary }),
  ], { x: 0.4, y: 0.82, w: 6.4, h: 4.4, valign: 'top' });

  // DTLS handshake column
  card(s, 7.1, 0.82, 2.6, 4.4, C.light);
  s.addText('DTLS Handshake', {
    x: 7.2, y: 0.87, w: 2.4, h: 0.28,
    color: C.primary, fontSize: 9, bold: true, align: 'center'
  });
  const msgs = [
    '\u2192 ClientHello', '\u2190 HelloVerifyReq',
    '\u2192 ClientHello', '\u2190 ServerHello',
    '\u2190 Certificate_s', '\u2190 CertReq', '\u2190 ServerHelloDone',
    '\u2192 Certificate_c','\u2192 ClientKeyExchange',
    '\u2192 CertificateVerify','\u2192 CCS + Finished',
    '\u2190 CCS + Finished',
  ];
  msgs.forEach(function(m, i) {
    s.addText(m, {
      x: 7.15, y: 1.22 + i * 0.26, w: 2.5, h: 0.24,
      color: m.startsWith('\u2192') ? C.navy : C.muted,
      fontSize: 8, fontFace: 'Courier New'
    });
  });

  footer(s, 3);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 4 — Key Formalisms
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'Key Formalisms');

  // Left card: Mealy Machine
  card(s, 0.3, 0.82, 4.55, 4.4, C.light);
  s.addText('Mealy Machine  M', {
    x: 0.45, y: 0.88, w: 4.25, h: 0.35,
    color: C.primary, fontSize: 14, bold: true
  });
  s.addText('M = (I, O, Q, q\u2080, \u03b4, \u03bb)', {
    x: 0.45, y: 1.28, w: 4.25, h: 0.3,
    color: C.navy, fontSize: 12, fontFace: 'Courier New'
  });
  s.addText([
    para('I  = input alphabet (client \u2192 server)', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('O  = output alphabet (server \u2192 client)', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('Q  = finite set of states', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('q\u2080 = initial state', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('\u03b4  : Q \u00d7 I \u2192 Q   (transition)', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('\u03bb  : Q \u00d7 I \u2192 O*  (output sequence)', { fontSize: 11, color: C.primary, paraSpaceAfter: 10 }),
    para('Obtained via active automata learning\n(L* / TTT queries to the black-box SUT)', { fontSize: 11, color: C.muted, italic: true }),
  ], { x: 0.45, y: 1.65, w: 4.25, h: 3.4, valign: 'top' });

  // Right card: Bug Pattern DFA
  card(s, 5.15, 0.82, 4.55, 4.4, C.accent);
  s.addText('Bug Pattern DFA  A\u1d65', {
    x: 5.3, y: 0.88, w: 4.25, h: 0.35,
    color: C.primary, fontSize: 14, bold: true
  });
  s.addText('A = (\u03a3, Q, q\u2080, \u0394, F)', {
    x: 5.3, y: 1.28, w: 4.25, h: 0.3,
    color: C.navy, fontSize: 12, fontFace: 'Courier New'
  });
  s.addText([
    para('\u03a3  = I \u222a O   (combined alphabet)', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('Q  = states tracking bug progress', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('F  = accepting states \u2192 bug detected', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('\u0394  : Q \u00d7 \u03a3 \u2192 Q  (undefined \u2192 SINK)', { fontSize: 11, color: C.primary, paraSpaceAfter: 10 }),
    para('Hand-crafted from RFC requirements', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('Typically just 3\u20135 states', { fontSize: 11, color: C.primary, paraSpaceAfter: 10 }),
    para('A_bug accepts a sequence w iff w\nprovides evidence of the bug', { fontSize: 11, color: C.muted, italic: true }),
  ], { x: 5.3, y: 1.65, w: 4.25, h: 3.4, valign: 'top' });

  footer(s, 4);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Three-Step Pipeline
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'The Three-Step Bug Detection Pipeline');

  const steps = [
    { n: '1', title: 'Learn Model',       body: 'Active automata learning\nqueries the implementation\nas a black box and infers\na Mealy machine M\n\n(L* / TTT algorithm)' },
    { n: '2', title: 'Encode Bug Pattern', body: 'Construct a 3\u20135 state DFA\nA_bug that accepts\nexactly the I/O sequences\nthat exhibit the bug\n\n(from RFC or prior CVEs)' },
    { n: '3', title: 'Intersect & Validate', body: 'A\u2229 = A_M \u2229 A_bug\nAlgorithm 1 extracts a\nwitness via backward BFS\nand replays on the SUT\nto confirm the bug' },
  ];

  steps.forEach(function(step, i) {
    const x = 0.25 + i * 3.28;
    card(s, x, 0.85, 3.05, 4.4, i === 2 ? C.accent : C.light);
    circle(s, x + 1.1, 0.98, 0.85, step.n);
    s.addText(step.title, {
      x: x + 0.1, y: 1.95, w: 2.85, h: 0.38,
      color: C.primary, fontSize: 12.5, bold: true, align: 'center'
    });
    s.addText(step.body, {
      x: x + 0.15, y: 2.42, w: 2.75, h: 2.65,
      color: C.navy, fontSize: 11, align: 'center', valign: 'top'
    });
    if (i < 2) {
      s.addShape(pres.ShapeType.rect, {
        x: x + 3.1, y: 3.05, w: 0.13, h: 0.13,
        fill: { color: C.muted }, line: { color: C.muted, pt: 0 }
      });
    }
  });

  footer(s, 5);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 6 — Mealy → DFA Conversion
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'Converting M to DFA A\u1d40 (Section VI)');

  s.addText(
    'DFA intersection requires both operands over the same alphabet \u03a3 = I \u222a O.\n' +
    'The Mealy machine must be converted to A_M that accepts all I/O sequences M can produce.',
    { x: 0.4, y: 0.82, w: 9.2, h: 0.6, color: C.navy, fontSize: 11.5 }
  );

  codeBox(s,
    'For each (q, i) with \u03bb(q,i) = o\u2081 o\u2082 \u2026 o\u2099  (n \u2265 1):\n' +
    '  introduce aux states  aux(q,i,0), aux(q,i,1), \u2026, aux(q,i,n-1)\n\n' +
    '  \u0394(q,          i)          = aux(q,i,0)\n' +
    '  \u0394(aux(q,i,k), o_{k+1})    = aux(q,i,k+1)   for k < n-1\n' +
    '  \u0394(aux(q,i,n-1), o_n)      = \u03b4(q,i)          (original Mealy target)\n\n' +
    'For each (q, i) with \u03bb(q,i) = \u03b5 (empty output):\n' +
    '  \u0394(q, i)  =  \u03b4(q,i)            (direct transition)\n\n' +
    'Accepting states F_M = Q  (all original Mealy states)\n' +
    'Undefined transitions \u2192 SINK (non-accepting)',
    0.4, 1.52, 5.7, 3.0
  );

  card(s, 6.3, 1.52, 3.4, 3.0, C.accent);
  s.addText('Key Properties', {
    x: 6.42, y: 1.58, w: 3.16, h: 0.3,
    color: C.primary, fontSize: 12, bold: true
  });
  s.addText([
    para('L(A_M) = all valid I/O traces of M', { fontSize: 11, color: C.primary, paraSpaceAfter: 5 }),
    para('Multi-output transitions become chains of auxiliary states', { fontSize: 11, color: C.primary, paraSpaceAfter: 5 }),
    para('All original Mealy states are accepting', { fontSize: 11, color: C.primary, paraSpaceAfter: 5 }),
    para('Undefined (state, input) pairs map to SINK', { fontSize: 11, color: C.primary, paraSpaceAfter: 5 }),
    para('|A_M| grows linearly with output lengths', { fontSize: 11, color: C.muted, italic: true }),
  ], { x: 6.42, y: 1.98, w: 3.16, h: 2.4, valign: 'top' });

  s.addText('Replication: |A_M| = 71\u201387 states for our mock DTLS models', {
    x: 0.4, y: 4.62, w: 9.2, h: 0.28,
    color: C.muted, fontSize: 10, italic: true
  });

  footer(s, 6);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 7 — DFA Intersection
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'DFA Intersection: A\u2229 = A\u1d40 \u2229 A\u1d65 (Section IV)');

  s.addText(
    'A sequence is a bug witness iff it is both producible by M and accepted by A_bug.',
    { x: 0.4, y: 0.82, w: 9.2, h: 0.35, color: C.navy, fontSize: 12 }
  );

  codeBox(s,
    'Cross-product construction:\n\n' +
    'A\u2229 = (\u03a3,  Q_M \u00d7 Q_b,  (q\u2080_M, q\u2080_b),  \u0394\u2019,  Q_M \u00d7 F_b)\n\n' +
    '  \u0394\u2019((q_M, q_b), l)  =  (\u0394_M(q_M, l),  \u0394_b(q_b, l))\n\n' +
    '  Accepting:  (q_M, q_b) where q_b \u2208 F_b\n' +
    '  (A_M accepts everything; A_bug must also accept)\n\n' +
    'After construction:\n' +
    '  Trim: remove unreachable states and dead states\n' +
    '  (states from which no accepting state is reachable)',
    0.4, 1.28, 5.7, 3.1
  );

  card(s, 6.3, 1.28, 3.4, 3.1, C.light);
  s.addText('Interpretation', {
    x: 6.42, y: 1.34, w: 3.16, h: 0.3,
    color: C.primary, fontSize: 12, bold: true
  });
  s.addText([
    para('L(A\u2229) = L(A_M) \u2229 L(A_bug)', { fontSize: 12, color: C.navy, fontFace: 'Courier New', paraSpaceAfter: 8 }),
    para('L(A\u2229) = \u2205', { fontSize: 11, bold: true, color: C.primary, paraSpaceAfter: 2 }),
    para('\u21d2 no bug exists in M', { fontSize: 11, color: C.navy, paraSpaceAfter: 8 }),
    para('L(A\u2229) \u2260 \u2205', { fontSize: 11, bold: true, color: C.primary, paraSpaceAfter: 2 }),
    para('\u21d2 bug may exist (verify on SUT)', { fontSize: 11, color: C.navy, paraSpaceAfter: 8 }),
    para('|A\u2229| \u2248 22\u201323 states in our replication', { fontSize: 10, color: C.muted, italic: true }),
  ], { x: 6.42, y: 1.72, w: 3.16, h: 2.5, valign: 'top' });

  s.addText(
    'The intersection uses BFS over product states, so only reachable ones are explored.',
    { x: 0.4, y: 4.5, w: 9.2, h: 0.3, color: C.muted, fontSize: 10, italic: true }
  );

  footer(s, 7);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 8 — Algorithm 1
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'Algorithm 1: Bug Witness Extraction (Section V)');

  codeBox(s,
    'Input:  A\u2229,  A_bug,  SUT,  K (max state visits, default K=2)\n' +
    'Output: (witness_inputs, observed_IO)  or  \u201cno bug found\u201d\n\n' +
    'WQ := {(q, \u03b5) : q \u2208 F}        // initialise with accepting states\n\n' +
    'while WQ is non-empty:\n' +
    '    (q, w) := dequeue(WQ)\n' +
    '    if q == q\u2080:              // found full path from initial \u2192 accepting\n' +
    '        replay  inputs(w)  on SUT\n' +
    '        let  w_obs = observed I/O sequence from SUT\n' +
    '        if  w_obs \u2208 L(A_bug):\n' +
    '            return (inputs(w), w_obs)  // BUG CONFIRMED\n\n' +
    '    for each (q\u2019, l) such that \u0394(q\u2019, l) = q:\n' +
    '        if maxStateVisits(q\u2019, l\u00b7w, A\u2229) \u2264 K:\n' +
    '            enqueue (q\u2019, l\u00b7w)',
    0.3, 0.82, 6.0, 4.0
  );

  card(s, 6.5, 0.82, 3.2, 4.0, C.accent);
  s.addText('Design Rationale', {
    x: 6.62, y: 0.88, w: 2.96, h: 0.3,
    color: C.primary, fontSize: 12, bold: true
  });
  s.addText([
    para('Backward BFS from accepting states \u2192 finds the shortest witness first', { fontSize: 10.5, color: C.primary, paraSpaceAfter: 6 }),
    para('maxStateVisits \u2264 K prevents looping sequences', { fontSize: 10.5, color: C.primary, paraSpaceAfter: 6 }),
    para('K = 2 suffices for all paper\u2019s bugs', { fontSize: 10.5, color: C.primary, paraSpaceAfter: 6 }),
    para('inputs(w) extracts only input symbols from the I/O sequence w', { fontSize: 10.5, color: C.primary, paraSpaceAfter: 10 }),
    para('SUT replay filters false alarms from approximate models', { fontSize: 10.5, color: C.muted, italic: true }),
  ], { x: 6.62, y: 1.28, w: 2.96, h: 3.35, valign: 'top' });

  footer(s, 8);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 9 — Bug Patterns
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'Bug Pattern DFAs Implemented (over \u03a3 = I \u222a O)');

  const pats = [
    {
      id: 'BP1', label: 'Missing Certificate',
      dfa:     'init --CertReq-> certreq\n       --Cert-> init\n       --CCS_s-> bug\u2605',
      witness: 'CH \u2192 CH \u2192 CertE \u2192 CKE\n\u2192 CertVer \u2192 CCS_c \u2192 Fin',
      desc:    'Server sends CCS_s after CertReq but without receiving a real Cert from the client. Mutual authentication is bypassed.',
    },
    {
      id: 'BP2', label: 'Missing CertVer',
      dfa:     'init --Cert-> cert\n       --CertVer-> init\n       --CCS_s-> bug\u2605',
      witness: 'CH \u2192 CH \u2192 Cert \u2192 CKE\n\u2192 CCS_c \u2192 Fin',
      desc:    'Client skips CertificateVerify (proof of private-key possession). Server completes handshake anyway.',
    },
    {
      id: 'BP3', label: 'CertVer Before CKE',
      dfa:     'init --CertVer-> cv\n       --CKE-> cke_after\n       --CCS_s-> bug\u2605',
      witness: 'CH \u2192 CH \u2192 Cert \u2192 CertVer\n\u2192 CKE \u2192 CCS_c \u2192 Fin',
      desc:    'RFC 6347 mandates CKE before CertVer. Server accepts the reversed order, enabling potential impersonation.',
    },
  ];

  pats.forEach(function(p, i) {
    const x = 0.22 + i * 3.27;
    card(s, x, 0.82, 3.12, 4.4, C.light);

    // ID badge
    s.addShape(pres.ShapeType.rect, {
      x: x + 0.12, y: 0.88, w: 0.5, h: 0.28,
      fill: { color: C.primary }, line: { color: C.primary, pt: 0 }
    });
    s.addText(p.id, {
      x: x + 0.12, y: 0.88, w: 0.5, h: 0.28,
      color: C.white, fontSize: 9, bold: true, align: 'center', valign: 'middle'
    });
    s.addText(p.label, {
      x: x + 0.7, y: 0.88, w: 2.4, h: 0.28,
      color: C.primary, fontSize: 11, bold: true
    });

    codeBox(s, p.dfa, x + 0.1, 1.24, 2.92, 0.95);

    s.addText('Witness (replicated):', {
      x: x + 0.1, y: 2.27, w: 2.92, h: 0.22,
      color: C.muted, fontSize: 8.5, italic: true
    });
    codeBox(s, p.witness, x + 0.1, 2.52, 2.92, 0.62);

    s.addText(p.desc, {
      x: x + 0.1, y: 3.24, w: 2.92, h: 1.85,
      color: C.navy, fontSize: 10, valign: 'top'
    });
  });

  footer(s, 9);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 10 — Results
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'Replication Results');

  s.addImage({
    path: path.join(RES, 'bug_detection_matrix.png'),
    x: 0.3, y: 0.85, w: 5.6, h: 3.3
  });

  card(s, 6.1, 0.85, 3.6, 4.4, C.light);
  s.addText('Key Results', {
    x: 6.22, y: 0.91, w: 3.36, h: 0.3,
    color: C.primary, fontSize: 13, bold: true
  });
  s.addText([
    para('12/12 detection decisions correct', { fontSize: 11, bold: true, color: C.primary, paraSpaceAfter: 4 }),
    para('3 bugs detected, 0 false positives', { fontSize: 11, color: C.navy, paraSpaceAfter: 10 }),
    para('Detection time per pair', { fontSize: 11, bold: true, color: C.primary, paraSpaceAfter: 4 }),
    para('1\u20134 ms  (matches \u201cwithin seconds\u201d)', { fontSize: 11, color: C.navy, paraSpaceAfter: 10 }),
    para('|A_M| = 71\u201387 states', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
    para('|A\u2229| = 22\u201323 states (after trim)', { fontSize: 11, color: C.primary, paraSpaceAfter: 10 }),
    para('Shortest witness lengths:', { fontSize: 11, bold: true, color: C.primary, paraSpaceAfter: 4 }),
    para('BP1:  7 inputs,  15 I/O symbols', { fontSize: 10.5, color: C.navy, paraSpaceAfter: 3 }),
    para('BP2:  6 inputs,  12 I/O symbols', { fontSize: 10.5, color: C.navy, paraSpaceAfter: 3 }),
    para('BP3:  7 inputs,  15 I/O symbols', { fontSize: 10.5, color: C.navy }),
  ], { x: 6.22, y: 1.28, w: 3.36, h: 3.8, valign: 'top' });

  s.addText(
    'Each bug confirmed by replaying its witness on the actual SUT. No false alarms.',
    { x: 0.3, y: 4.27, w: 5.6, h: 0.3, color: C.muted, fontSize: 10, italic: true, align: 'center' }
  );

  footer(s, 10);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 11 — Message Flow
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'Bug Witness: Missing Certificate (BP1)');

  s.addImage({
    path: path.join(RES, 'message_flow.png'),
    x: 0.3, y: 0.85, w: 6.3, h: 4.0
  });

  card(s, 6.75, 0.85, 2.95, 4.1, C.accent);
  s.addText('Reading the Witness', {
    x: 6.87, y: 0.91, w: 2.71, h: 0.3,
    color: C.primary, fontSize: 12, bold: true
  });
  s.addText([
    para('Algorithm 1 produces the shortest sequence that triggers the bug', { fontSize: 10.5, color: C.primary, paraSpaceAfter: 8 }),
    para('CertE (empty cert) sent instead of a valid certificate', { fontSize: 10.5, bold: true, color: C.primary, paraSpaceAfter: 4 }),
    para('Buggy server: treats CertE identically to a real Cert', { fontSize: 10.5, color: C.navy, paraSpaceAfter: 8 }),
    para('Handshake completes (CCS_s sent)', { fontSize: 10.5, bold: true, color: C.primary, paraSpaceAfter: 4 }),
    para('despite no verified certificate', { fontSize: 10.5, color: C.navy, paraSpaceAfter: 10 }),
    para('\u2192 Mutual authentication is bypassed', { fontSize: 11, bold: true, color: C.primary }),
  ], { x: 6.87, y: 1.3, w: 2.71, h: 3.4, valign: 'top' });

  footer(s, 11);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 12 — Limitations
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'Limitations of This Replication');

  const lims = [
    {
      title: 'Mock SUTs, not real servers',
      body:  'Real paper tested OpenSSL, GnuTLS, WolfSSL, etc. This replication uses hand-written\nPython state machines that precisely embed the known bugs. Results are deterministic, not probabilistic.'
    },
    {
      title: 'Models analytically constructed',
      body:  'The paper learns Mealy machines via active automata learning (L*/TTT). Here, models are\nbuilt directly from SUT code. The intersection and Algorithm 1 are faithful; the learning step is not.'
    },
    {
      title: 'Three bug patterns only',
      body:  'The paper covers more bug classes across DTLS and SSH. Only BP1, BP2, BP3 are implemented\nhere; extending to new protocols requires new hand-crafted bug-pattern DFAs.'
    },
    {
      title: 'No scalability or robustness data',
      body:  'The paper reports learning times (hours) and model sizes for 12 real implementations.\nThis replication has no learning overhead, so timing comparisons are not meaningful.'
    },
  ];

  lims.forEach(function(lim, i) {
    const y = 0.88 + i * 1.08;
    card(s, 0.35, y, 9.3, 0.96, C.light);
    s.addText(lim.title, {
      x: 0.55, y: y + 0.06, w: 9.0, h: 0.26,
      color: C.primary, fontSize: 11, bold: true
    });
    s.addText(lim.body, {
      x: 0.55, y: y + 0.36, w: 9.0, h: 0.52,
      color: C.navy, fontSize: 10
    });
  });

  footer(s, 12);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 13 — Conclusion (dark)
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s, C.darkbg);

  s.addText('Conclusions', {
    x: 0.5, y: 0.45, w: 9, h: 0.52,
    color: C.white, fontSize: 26, bold: true
  });
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 1.02, w: 9, h: 0.025,
    fill: { color: C.muted }, line: { color: C.muted, pt: 0 }
  });

  const pts = [
    ['What the paper achieves',
     'Fully automated detection of state machine bugs across 12 DTLS/SSH implementations.\n7 previously unknown bugs discovered, including critical mutual-authentication bypasses.'],
    ['Core algorithms replicated',
     'Mealy \u2192 DFA (Section VI) + DFA intersection (Section IV) + Algorithm 1 (Section V)\nimplemented in pure Python. All 12 detection results correct.'],
    ['Results match the paper',
     '3 bug classes detected in < 5 ms each. Zero false positives on the correct model.\nMinimal witnesses confirmed by SUT replay.'],
    ['Practical significance',
     'Automates what previously required expert manual analysis of learned models,\nenabling scalable security auditing of protocol implementations at deployment time.'],
  ];

  pts.forEach(function(pt, i) {
    s.addText(pt[0], {
      x: 0.5, y: 1.18 + i * 0.96, w: 9, h: 0.28,
      color: C.border, fontSize: 11, bold: true
    });
    s.addText(pt[1], {
      x: 0.7, y: 1.48 + i * 0.96, w: 8.6, h: 0.56,
      color: C.muted, fontSize: 10.5
    });
  });

  s.addText(
    'COE 576 Networks and Web Security  |  KNUST MPhil  |  September 2026  |  Bless Elikem Krapah',
    { x: 0, y: H - 0.25, w: W, h: 0.25, color: C.muted, fontSize: 7.5, align: 'center' }
  );
  footer(s, 13);
}

// ── Write output ──────────────────────────────────────────────────────────
const outPath = path.join(__dirname, 'presentation.pptx');
pres.writeFile({ fileName: outPath })
  .then(function() { console.log('Written:', outPath); })
  .catch(function(err) { console.error(err); process.exit(1); });
