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

// ── DFA state-machine drawing helpers ────────────────────────────────────
var DFA_R = 0.185;   // state circle radius (inches)

function dfaState(s, cx, cy, label, isAccepting) {
  if (isAccepting) {
    s.addShape(pres.ShapeType.ellipse, {
      x: cx - DFA_R - 0.05, y: cy - DFA_R - 0.05,
      w: (DFA_R + 0.05) * 2, h: (DFA_R + 0.05) * 2,
      fill: { color: C.bg }, line: { color: C.primary, pt: 1 }
    });
  }
  s.addShape(pres.ShapeType.ellipse, {
    x: cx - DFA_R, y: cy - DFA_R, w: DFA_R * 2, h: DFA_R * 2,
    fill: { color: isAccepting ? C.primary : C.white },
    line: { color: C.primary, pt: 1.5 }
  });
  s.addText(label, {
    x: cx - DFA_R, y: cy - DFA_R, w: DFA_R * 2, h: DFA_R * 2,
    color: isAccepting ? C.white : C.primary,
    fontSize: 6, bold: true, align: 'center', valign: 'middle', margin: 0
  });
}

function dfaStart(s, cx, cy) {
  s.addShape(pres.ShapeType.line, {
    x: cx - DFA_R - 0.18, y: cy, w: 0.18, h: 0,
    line: { color: C.primary, pt: 1.5, endArrowType: 'arrow', endArrowSize: 2 }
  });
}

function dfaFwd(s, cx1, cy, cx2, label, lw) {
  var sx = cx1 + DFA_R, ex = cx2 - DFA_R;
  s.addShape(pres.ShapeType.line, {
    x: sx, y: cy, w: ex - sx, h: 0,
    line: { color: C.primary, pt: 1, endArrowType: 'arrow', endArrowSize: 2 }
  });
  if (label) {
    var w = lw || 0.76;
    s.addText(label, {
      x: (sx + ex) / 2 - w / 2, y: cy - 0.19, w: w, h: 0.17,
      color: C.navy, fontSize: 6.5, align: 'center', margin: 0
    });
  }
}

function dfaArcAbove(s, cx_from, cy, cx_to, peakY, label) {
  var ty = cy - DFA_R;
  var midX = (cx_from + cx_to) / 2;
  // Staircase arc above states — all dimensions positive (avoids invalid OOXML)
  // Right leg: vertical from peak down to cx_from circle top
  s.addShape(pres.ShapeType.line, {
    x: cx_from, y: peakY, w: 0.01, h: ty - peakY,
    line: { color: C.navy, pt: 1 }
  });
  // Top span: horizontal at peak height from cx_to to cx_from
  s.addShape(pres.ShapeType.line, {
    x: cx_to, y: peakY, w: cx_from - cx_to, h: 0.01,
    line: { color: C.navy, pt: 1 }
  });
  // Left leg: vertical from peak down to cx_to circle top, arrow points down into circle
  s.addShape(pres.ShapeType.line, {
    x: cx_to, y: peakY, w: 0.01, h: ty - peakY,
    line: { color: C.navy, pt: 1, endArrowType: 'arrow', endArrowSize: 2 }
  });
  if (label) {
    s.addText(label, {
      x: midX - 0.33, y: peakY - 0.17, w: 0.66, h: 0.16,
      color: C.navy, fontSize: 6.5, align: 'center', margin: 0
    });
  }
}

function dfaArcBelow(s, cx_from, cy, cx_to, peakY, label) {
  var by = cy + DFA_R;
  var midX = (cx_from + cx_to) / 2;
  // Staircase arc below states — all dimensions positive
  // Right leg: vertical from cx_from circle bottom down to peak
  s.addShape(pres.ShapeType.line, {
    x: cx_from, y: by, w: 0.01, h: peakY - by,
    line: { color: C.navy, pt: 1 }
  });
  // Bottom span: horizontal at peak height from cx_to to cx_from
  s.addShape(pres.ShapeType.line, {
    x: cx_to, y: peakY, w: cx_from - cx_to, h: 0.01,
    line: { color: C.navy, pt: 1 }
  });
  // Left leg: line from cx_to circle bottom to peak; beginArrow points up into circle
  s.addShape(pres.ShapeType.line, {
    x: cx_to, y: by, w: 0.01, h: peakY - by,
    line: { color: C.navy, pt: 1, beginArrowType: 'arrow', beginArrowSize: 2 }
  });
  if (label) {
    s.addText(label, {
      x: midX - 0.33, y: peakY + 0.01, w: 0.66, h: 0.16,
      color: C.navy, fontSize: 6.5, align: 'center', margin: 0
    });
  }
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
  headerBand(s, 'The Three-Step Bug Detection Pipeline');

  const steps = [
    { n: '1', title: 'Learn Model',       body: 'Active automata learning\nqueries the implementation\nas a black box and infers\na Mealy machine M\n\n(L* / TTT algorithm)' },
    { n: '2', title: 'Encode Bug Pattern', body: 'Construct a 3–5 state DFA\nA_bug that accepts\nexactly the I/O sequences\nthat exhibit the bug\n\n(from RFC or prior CVEs)' },
    { n: '3', title: 'Intersect & Validate', body: 'A∩ = A_M ∩ A_bug\nAlgorithm 1 extracts a\nwitness via backward BFS\nand replays on the SUT\nto confirm the bug' },
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

  footer(s, 4);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Key Formalisms + Bug Pattern DFAs
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, 'Key Formalisms');

  // Compressed definition cards (top ~1/3 of slide)
  card(s, 0.3, 0.82, 4.55, 1.82, C.light);
  s.addText('Mealy Machine  M', {
    x: 0.45, y: 0.88, w: 4.25, h: 0.32,
    color: C.primary, fontSize: 13.5, bold: true
  });
  s.addText('M = (I, O, Q, q₀, δ, λ)', {
    x: 0.45, y: 1.23, w: 4.25, h: 0.26,
    color: C.navy, fontSize: 11, fontFace: 'Courier New'
  });
  s.addText([
    para('I = inputs,  O = outputs,  Q = states', { fontSize: 10, color: C.primary, paraSpaceAfter: 2 }),
    para('δ : transitions,  λ : output function', { fontSize: 10, color: C.primary, paraSpaceAfter: 4 }),
    para('Learned from black-box SUT (L* / TTT)', { fontSize: 10, color: C.muted, italic: true }),
  ], { x: 0.45, y: 1.54, w: 4.25, h: 1.06, valign: 'top' });

  card(s, 5.15, 0.82, 4.55, 1.82, C.accent);
  s.addText([
    para('Bug Pattern DFA  A', { color: C.primary, fontSize: 13.5, bold: true }),
    para('bug', { color: C.primary, fontSize: 10, bold: true, subScript: true }),
  ], { x: 5.3, y: 0.88, w: 4.25, h: 0.32 });
  s.addText('A = (Σ, Q, q₀, Δ, F)', {
    x: 5.3, y: 1.23, w: 4.25, h: 0.26,
    color: C.navy, fontSize: 11, fontFace: 'Courier New'
  });
  s.addText([
    para('Σ = I ∪ O,  F = accepting states → bug', { fontSize: 10, color: C.primary, paraSpaceAfter: 4 }),
    para('Accepts w iff w exhibits the bug; 3–5 states', { fontSize: 10, color: C.muted, italic: true }),
  ], { x: 5.3, y: 1.54, w: 4.25, h: 1.06, valign: 'top' });

  // Divider + DFA section header
  s.addShape(pres.ShapeType.line, {
    x: 0.3, y: 2.74, w: 9.4, h: 0,
    line: { color: C.border, pt: 0.75 }
  });
  s.addText('Bug Pattern DFAs: BP1, BP2, BP3  (hand-crafted from RFC; 3-4 states; double circle = accepting = bug detected)', {
    x: 0.3, y: 2.80, w: 9.4, h: 0.22,
    color: C.primary, fontSize: 9, bold: true
  });

  // DFA sub-titles
  s.addText('BP1  Missing Certificate', {
    x: 0.20, y: 3.06, w: 2.90, h: 0.20,
    color: C.navy, fontSize: 8.5, bold: true, align: 'center'
  });
  s.addText('BP2  Missing CertVer', {
    x: 3.50, y: 3.06, w: 2.90, h: 0.20,
    color: C.navy, fontSize: 8.5, bold: true, align: 'center'
  });
  s.addText('BP3  CertVer before CKE', {
    x: 6.75, y: 3.06, w: 3.10, h: 0.20,
    color: C.navy, fontSize: 8.5, bold: true, align: 'center'
  });

  var yS = 4.40;   // state center y

  // BP1: init --CertReq--> s1 --CCS_s--> BUG   (Cert resets s1->init)
  dfaState(s, 0.73, yS, 'init', false);
  dfaState(s, 1.68, yS, 's1', false);
  dfaState(s, 2.63, yS, 'BUG', true);
  dfaStart(s, 0.73, yS);
  dfaFwd(s, 0.73, yS, 1.68, 'CertReq', 0.74);
  dfaFwd(s, 1.68, yS, 2.63, 'CCS_s', 0.74);
  dfaArcAbove(s, 1.68, yS, 0.73, 3.72, 'Cert');

  // BP2: init --Cert--> s1 --CCS_s--> BUG   (CertVer resets s1->init)
  dfaState(s, 4.08, yS, 'init', false);
  dfaState(s, 5.03, yS, 's1', false);
  dfaState(s, 5.98, yS, 'BUG', true);
  dfaStart(s, 4.08, yS);
  dfaFwd(s, 4.08, yS, 5.03, 'Cert', 0.74);
  dfaFwd(s, 5.03, yS, 5.98, 'CCS_s', 0.74);
  dfaArcAbove(s, 5.03, yS, 4.08, 3.72, 'CertVer');

  // BP3: init --CertVer--> s1 --CKE--> s2 --CCS_s--> BUG
  //      SH resets: s1->init (above arc), s2->init (below arc)
  dfaState(s, 7.14, yS, 'init', false);
  dfaState(s, 7.95, yS, 's1', false);
  dfaState(s, 8.76, yS, 's2', false);
  dfaState(s, 9.57, yS, 'BUG', true);
  dfaStart(s, 7.14, yS);
  dfaFwd(s, 7.14, yS, 7.95, 'CertVer', 0.60);
  dfaFwd(s, 7.95, yS, 8.76, 'CKE', 0.60);
  dfaFwd(s, 8.76, yS, 9.57, 'CCS_s', 0.60);
  dfaArcAbove(s, 7.95, yS, 7.14, 3.65, 'SH');
  dfaArcBelow(s, 8.76, yS, 7.14, 4.97, 'SH');

  s.addText('BP3: s1 = certver  |  s2 = cke_after  |  SH = renegotiation reset  |  self-loops on other symbols not shown', {
    x: 6.65, y: 5.22, w: 3.20, h: 0.18,
    color: C.muted, fontSize: 5.5, align: 'center'
  });

  footer(s, 5);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 6 — Mealy → DFA Conversion
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, [
    para('Converting M to DFA A', { color: C.white, fontSize: 21, bold: true }),
    para('M', { color: C.white, fontSize: 14, bold: true, subScript: true }),
    para(' (Section VI)', { color: C.white, fontSize: 21, bold: true }),
  ]);

  s.addText([
    para('A', { color: C.navy, fontSize: 11 }),
    para('M', { color: C.navy, fontSize: 8, subScript: true }),
    para(' accepts all I/O traces M can produce. Both operands require the same alphabet Σ = I ∪ O for intersection.', { color: C.navy, fontSize: 11 }),
  ], { x: 0.4, y: 0.82, w: 9.2, h: 0.34 });

  // Column headers
  s.addText('Mealy machine  M', {
    x: 0.3, y: 1.20, w: 3.90, h: 0.26,
    color: C.primary, fontSize: 11.5, bold: true, align: 'center'
  });
  s.addText([
    para('DFA  A', { color: C.primary, fontSize: 11.5, bold: true }),
    para('M', { color: C.primary, fontSize: 9, bold: true, subScript: true }),
  ], { x: 4.78, y: 1.20, w: 4.82, h: 0.26, align: 'center' });

  var mapRows = [
    { m: 'I, O  (input & output alphabets)',         hl: false, am: 'Σ = I ∪ O  (same combined alphabet)' },
    { m: 'Q  (set of states)',                        hl: false, am: 'Q ∪ Q_aux ∪ {SINK}  (original + auxiliary + dead)' },
    { m: 'q₀  (initial state)',                  hl: false, am: 'q₀  (unchanged)' },
    { m: 'δ : Q × I → Q  (transitions)', hl: true,  am: 'Δ encodes target state at end of Q_aux chain' },
    { m: 'λ : Q × I → O*  (output fn)',  hl: true,  am: 'Each output symbol = one auxiliary-state step' },
    { m: '(none — Mealy has no accepting concept)', hl: false, am: 'F = Q  (all original Mealy states accepting)' },
  ];

  mapRows.forEach(function(row, i) {
    var y = 1.52 + i * 0.52;
    var bg = row.hl ? C.accent : C.light;
    card(s, 0.3, y, 3.90, 0.48, bg);
    s.addText(row.m, {
      x: 0.42, y: y + 0.06, w: 3.66, h: 0.36,
      color: C.primary, fontSize: 10.5, valign: 'middle'
    });
    s.addShape(pres.ShapeType.line, {
      x: 4.24, y: y + 0.24, w: 0.40, h: 0,
      line: { color: C.muted, pt: 1.5, endArrowType: 'arrow', endArrowSize: 2 }
    });
    card(s, 4.78, y, 4.82, 0.48, bg);
    s.addText(row.am, {
      x: 4.90, y: y + 0.06, w: 4.58, h: 0.36,
      color: C.primary, fontSize: 10.5, valign: 'middle'
    });
  });

  s.addText(
    'Chain example: (q, i) with output o₁ o₂ →  q →[i]→ aux₁ →[o₁]→ aux₂ →[o₂]→ q\'   (q, q’ ∈ F;  aux states not in F)',
    { x: 0.4, y: 4.74, w: 9.2, h: 0.28, color: C.navy, fontSize: 10 }
  );
  s.addText([
    para('Replication: |A', { color: C.muted, fontSize: 9.5, italic: true }),
    para('M', { color: C.muted, fontSize: 7, subScript: true, italic: true }),
    para('| = 71–87 states for our mock DTLS models', { color: C.muted, fontSize: 9.5, italic: true }),
  ], { x: 0.4, y: 5.07, w: 9.2, h: 0.22 });

  footer(s, 6);
}

// ────────────────────────────────────────────────────────────────────────
// SLIDE 7 — DFA Intersection
// ────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bgRect(s);
  headerBand(s, [
    para('DFA Intersection: A\u2229 = A', { color: C.white, fontSize: 21, bold: true }),
    para('M', { color: C.white, fontSize: 14, bold: true, subScript: true }),
    para(' \u2229 A', { color: C.white, fontSize: 21, bold: true }),
    para('bug', { color: C.white, fontSize: 14, bold: true, subScript: true }),
    para(' (Section IV)', { color: C.white, fontSize: 21, bold: true }),
  ]);

  s.addText([
    para('A sequence is a bug witness iff it is both producible by M and accepted by A', { color: C.navy, fontSize: 12 }),
    para('bug', { color: C.navy, fontSize: 9, subScript: true }),
    para('.', { color: C.navy, fontSize: 12 }),
  ], { x: 0.4, y: 0.82, w: 9.2, h: 0.35 });

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
    para('|A', { fontSize: 11, color: C.primary }),
    para('M', { fontSize: 8, color: C.primary, subScript: true }),
    para('| = 71\u201387 states', { fontSize: 11, color: C.primary, paraSpaceAfter: 3 }),
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
