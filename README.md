# Automata-Based Protocol Bug Detection — Paper #8 Replication

**COE 576 Networks and Web Security | End-of-Semester Assignment**
**Student:** Bless Elikem Krapah

---

## Paper

> "Automata-Based Automated Detection of State Machine Bugs in Protocol Implementations"  
> NDSS 2023 — [ndss-symposium.org](https://www.ndss-symposium.org/ndss-paper/automata-based-automated-detection-of-state-machine-bugs-in-protocol-implementations/)

---

## What the Paper Does

Protocol implementations (TLS, DTLS, SSH, …) often contain state-machine bugs — cases where the server accepts a message sequence that violates the RFC, enabling attacks. The paper automates their detection in three steps:

1. **Learn** a Mealy machine model of the black-box implementation using active automata learning (L\*/TTT).
2. **Encode** known bug classes as small DFAs (the *bug patterns*).
3. **Intersect** the implementation DFA with the bug-pattern DFA; if the language is non-empty, a bug-exposing sequence exists. **Algorithm 1** extracts it via backward BFS and validates it on the real implementation.

---

## Replication Scope

The paper's artefact is a 10 GB VM with DTLS-Fuzzer (Java) and real protocol servers. This replication focuses on the **core algorithmic contribution** (Sections IV–VI):

| Component | Paper | This replication |
|---|---|---|
| Mealy machine acquisition | Active learning (L\*/TTT) | Analytically constructed to match SUT |
| Bug pattern DFAs | Figs 4–7 | Faithfully implemented |
| Mealy → DFA conversion | Section VI definition | `src/conversion.py` |
| DFA intersection | Cross-product (Section IV) | `src/intersection.py` |
| Algorithm 1 (BFS + validation) | Section V | `src/detection.py` |
| SUT | Real OpenSSL / GnuTLS / … | Mock Python state machines (`src/sut.py`) |

---

## Bug Patterns Implemented

| ID | Paper Bug | Description |
|---|---|---|
| BP1 | Missing Certificate | Server completes handshake without receiving a client certificate after sending CertificateRequest |
| BP2 | Missing CertVer | Server completes handshake without the client proving private-key possession via CertificateVerify |
| BP3 | CertVer before CKE | Server accepts CertificateVerify before ClientKeyExchange (wrong RFC ordering) |

---

## Installation

```bash
pip install -r requirements.txt
```

No other dependencies. Python 3.9+ required.

---

## Usage

```bash
# Run bug detection and print results table
python main.py

# Generate result figures into results/
python visualize.py
```

---

## Results

```
Implementation      BP1 MissingCert   BP2 MissingCertVer   BP3 CertVer<CKE
Correct             —                 —                    —
MissingCert         BUG               —                    —
MissingCertVer      —                 BUG                  —
CertVerBeforeCKE    —                 —                    BUG
```

- All bugs detected in < 5 ms (matching the paper's "within seconds" claim).
- Zero false positives on the correct reference implementation.
- Each detection produces a minimal witness sequence confirmed on the SUT.

---

## Project Structure

```
src/
  mealy.py         Mealy machine (Section VI)
  dfa.py           DFA + cross-product helpers
  conversion.py    Mealy → DFA A_M (Section VI)
  intersection.py  DFA intersection A_M ∩ A_bug (Section IV)
  detection.py     Algorithm 1: backward BFS + SUT validation (Section V)
  sut.py           Mock DTLS-like SUTs (correct + 3 buggy)

models/
  protocol_models.py   Mealy machines for each SUT variant

bug_patterns/
  dtls_patterns.py     Bug pattern DFAs (BP1, BP2, BP3)

results/
  bug_detection_matrix.png    Heat-map: (model × pattern) detection results
  witness_lengths.png         Witness sequence lengths per bug (original)
  state_counts.png            |A_M| vs |A_∩| state counts
  message_flow.png            Message flow diagram for BP1 witness

main.py       Orchestration
visualize.py  Figures
```

---

## Key Algorithms

**Mealy → DFA conversion (`conversion.py`):**
For each transition `(q, i) → (o₁…oₙ, q′)`, introduce *n* auxiliary states chained by output symbols. All original Mealy states are accepting. This ensures the DFA accepts exactly the I/O sequences the implementation can produce.

**DFA Intersection (`intersection.py`):**
Cross-product of `A_M` and `A_bug`. State `(qM, qb)` is accepting iff `qb ∈ F_bug`. Trimming removes unreachable and dead states.

**Algorithm 1 (`detection.py`):**
Backward BFS from accepting states of `A_∩`. Each `(state, sequence w)` pair means "following `w` from `state` reaches an accepting state." When `state == q0`, `inputs(w)` is replayed on the real SUT; if the observed I/O is accepted by `A_bug`, the bug is confirmed.
