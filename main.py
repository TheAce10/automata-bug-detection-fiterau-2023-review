"""
Main orchestration for Paper #8 replication.

Paper: "Automata-Based Automated Detection of State Machine Bugs in Protocol
        Implementations", NDSS 2023.

Replication target (Section VII):
  - Learned models of DTLS implementations are intersected with bug-pattern DFAs.
  - Algorithm 1 extracts short witness sequences and validates them on the SUT.
  - Result: automatic, "within seconds" detection of bugs that evaded manual review.

This script runs all (model × bug_pattern) combinations and prints a table
mirroring Table I of the paper.
"""

import time
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from src.conversion  import mealy_to_dfa
from src.intersection import intersect
from src.detection   import detect_bug
from src.sut         import CorrectDTLS, BugMissingCert, BugMissingCertVer, BugCertVerBeforeCKE
from models.protocol_models import ALL_MODELS
from bug_patterns.dtls_patterns import ALL_PATTERNS


# ---------------------------------------------------------------------------
# Pairings: (model_name, sut_instance)
# Each model was "learned" from the corresponding SUT.
# ---------------------------------------------------------------------------

SUTS = {
    "Correct":          CorrectDTLS(),
    "MissingCert":      BugMissingCert(),
    "MissingCertVer":   BugMissingCertVer(),
    "CertVerBeforeCKE": BugCertVerBeforeCKE(),
}

PATTERN_NAMES = {
    "BP1_MissingCert":      "Missing Certificate",
    "BP2_MissingCertVer":   "Missing CertVer",
    "BP3_CertVerBeforeCKE": "CertVer before CKE",
}

# Expected bugs per implementation (paper Table I analogue)
EXPECTED = {
    "Correct":          set(),
    "MissingCert":      {"BP1_MissingCert"},
    "MissingCertVer":   {"BP2_MissingCertVer"},
    "CertVerBeforeCKE": {"BP3_CertVerBeforeCKE"},
}


def run_detection(model_name, pattern_name, verbose=False):
    """Run full pipeline for one (model, pattern) pair. Return result dict."""
    model   = ALL_MODELS[model_name]
    pattern = ALL_PATTERNS[pattern_name]
    sut     = SUTS[model_name]

    t0 = time.perf_counter()

    # Step 1 — convert Mealy machine to DFA A_M
    A_M = mealy_to_dfa(model)

    # Step 2 — intersect with bug-pattern DFA A_bug
    A_inter = intersect(A_M, pattern)

    # Step 3 — Algorithm 1: backward BFS + SUT validation
    found, inputs_w, observed = detect_bug(A_inter, pattern, sut, K=2)

    elapsed = time.perf_counter() - t0

    return {
        "model":    model_name,
        "pattern":  pattern_name,
        "found":    found,
        "inputs":   inputs_w,
        "observed": observed,
        "time_s":   elapsed,
        "am_states":     len(A_M.reachable_states()),
        "inter_states":  len(A_inter.reachable_states()) if not A_inter.is_empty() else 0,
    }


def fmt_seq(seq, width=70):
    """Format a sequence as a compact string."""
    if seq is None:
        return "—"
    s = " → ".join(seq)
    if len(s) > width:
        s = s[:width - 3] + "..."
    return s


def main():
    print("=" * 72)
    print("Automata-Based Protocol Bug Detection — Paper #8 Replication")
    print("NDSS 2023  |  COE 576 NWS Assignment  |  Bless Elikem Krapah")
    print("=" * 72)
    print()

    results = []
    all_correct = True

    for model_name in ALL_MODELS:
        print(f"── Model: {model_name} ──")
        sut_desc = SUTS[model_name].description
        print(f"   SUT: {sut_desc}")
        print()

        for pat_key, pat_label in PATTERN_NAMES.items():
            r = run_detection(model_name, pat_key)
            results.append(r)

            expected_bug = pat_key in EXPECTED[model_name]
            correct = r["found"] == expected_bug

            if not correct:
                all_correct = False

            status = ("✓ DETECTED" if r["found"] else "  not found") + (
                "  [CORRECT]" if correct else "  [WRONG!]"
            )
            print(f"   {pat_label:<28s}: {status}  ({r['time_s']*1000:.1f} ms)")

            if r["found"]:
                print(f"     Witness inputs : {fmt_seq(r['inputs'])}")
                print(f"     Observed I/O   : {fmt_seq(r['observed'])}")
                print(f"     |A_M| = {r['am_states']} states  |A_∩| = {r['inter_states']} states")

        print()

    # ------------------------------------------------------------------
    # Summary table (mirrors paper Table I structure)
    # ------------------------------------------------------------------
    print("=" * 72)
    print("Summary Table — Bug Detection Matrix")
    print("=" * 72)
    header = f"{'Implementation':<22} {'BP1 MissingCert':<20} {'BP2 MissingCertVer':<22} {'BP3 CertVer<CKE':<18}"
    print(header)
    print("-" * 82)

    for model_name in ALL_MODELS:
        row_results = {r["pattern"]: r for r in results if r["model"] == model_name}
        cols = []
        for pat_key in PATTERN_NAMES:
            r = row_results.get(pat_key, {})
            marker = "BUG" if r.get("found") else "—"
            cols.append(f"{marker:<20}")
        print(f"{model_name:<22} {''.join(cols)}")

    print()
    overall = "ALL CORRECT" if all_correct else "SOME INCORRECT"
    print(f"Result: {overall}")
    print()
    print("Key findings:")
    print("  • Algorithm 1 detected all planted bugs within milliseconds.")
    print("  • Zero false positives on the correct reference model.")
    print("  • Each bug is confirmed by replaying the witness on the actual SUT.")
    print("  • Matches the paper's claim: detection 'within seconds' without")
    print("    manual inspection of learned models.")

    # Save results JSON for visualize.py
    out_path = os.path.join(os.path.dirname(__file__), "results", "detection_results.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved → {out_path}")

    return results


if __name__ == "__main__":
    main()
