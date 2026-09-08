"""
Visualization for the bug detection results.

Generates four figures saved to results/:
  1. bug_detection_matrix.png  — heat-map of (model × pattern) results
  2. witness_lengths.png        — bar chart of witness sequence lengths
  3. state_counts.png           — A_M and A_∩ state counts
  4. message_flow.png           — message flow diagram for one witness

Run after main.py (which saves results/detection_results.json).
"""

import json
import os
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.gridspec import GridSpec

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
JSON_PATH   = os.path.join(RESULTS_DIR, "detection_results.json")

MODEL_LABELS = {
    "Correct":          "Correct\n(no bugs)",
    "MissingCert":      "Missing\nCertificate",
    "MissingCertVer":   "Missing\nCertVer",
    "CertVerBeforeCKE": "CertVer\nbefore CKE",
}
PATTERN_LABELS = {
    "BP1_MissingCert":      "BP1\nMissing Cert",
    "BP2_MissingCertVer":   "BP2\nMissing CertVer",
    "BP3_CertVerBeforeCKE": "BP3\nCertVer < CKE",
}

MODELS   = list(MODEL_LABELS.keys())
PATTERNS = list(PATTERN_LABELS.keys())

# Palette — greyscale-friendly
C_BUG      = "#222222"
C_NOBUG    = "#DDDDDD"
C_CORRECT  = "#555555"
C_WRONG    = "#AA0000"
C_ACCENT   = "#111111"
C_GRID     = "#BBBBBB"


def load():
    with open(JSON_PATH) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Figure 1 — Bug detection matrix (heat-map)
# ---------------------------------------------------------------------------
def fig_matrix(results):
    grid = {}
    for r in results:
        grid[(r["model"], r["pattern"])] = r["found"]

    nrows, ncols = len(MODELS), len(PATTERNS)
    mat = np.zeros((nrows, ncols))
    for i, m in enumerate(MODELS):
        for j, p in enumerate(PATTERNS):
            mat[i, j] = 1.0 if grid.get((m, p), False) else 0.0

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.imshow(mat, cmap="gray_r", vmin=0, vmax=1, aspect="auto")

    ax.set_xticks(range(ncols))
    ax.set_xticklabels([PATTERN_LABELS[p] for p in PATTERNS], fontsize=10)
    ax.set_yticks(range(nrows))
    ax.set_yticklabels([MODEL_LABELS[m] for m in MODELS], fontsize=10)

    for i in range(nrows):
        for j in range(ncols):
            val = mat[i, j]
            txt = "BUG" if val > 0.5 else "—"
            color = "white" if val > 0.5 else "#555555"
            ax.text(j, i, txt, ha="center", va="center", fontsize=11,
                    fontweight="bold", color=color)

    ax.set_title("Bug Detection Matrix (A)", fontsize=12, fontweight="bold", pad=10)
    ax.set_xlabel("Bug Pattern", fontsize=10)
    ax.set_ylabel("Protocol Implementation", fontsize=10)

    patch_bug  = mpatches.Patch(color=C_BUG,   label="Bug detected")
    patch_none = mpatches.Patch(color=C_NOBUG,  label="No bug")
    ax.legend(handles=[patch_bug, patch_none], loc="upper right",
              fontsize=9, framealpha=0.9)

    fig.tight_layout()
    path = os.path.join(RESULTS_DIR, "bug_detection_matrix.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved → {path}")


# ---------------------------------------------------------------------------
# Figure 2 — Witness sequence lengths (original contribution)
# This goes beyond the paper's figures: it shows how Algorithm 1's backward
# BFS finds the SHORTEST possible witness for each bug.
# ---------------------------------------------------------------------------
def fig_witness_lengths(results):
    bugged = [r for r in results if r["found"] and r["inputs"]]
    if not bugged:
        print("No witnesses to plot.")
        return

    labels = [f"{MODEL_LABELS[r['model']].replace(chr(10),' ')}\n{PATTERN_LABELS[r['pattern']].replace(chr(10),' ')}"
              for r in bugged]
    inp_lens = [len(r["inputs"])   for r in bugged]
    obs_lens = [len(r["observed"]) for r in bugged]

    x = np.arange(len(bugged))
    w = 0.35

    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.bar(x - w/2, inp_lens, w, label="Input symbols",  color="#444444")
    ax.bar(x + w/2, obs_lens, w, label="Observed I/O",   color="#AAAAAA")

    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=8)
    ax.set_ylabel("Sequence length (symbols)", fontsize=10)
    ax.set_title("Shortest Witness Sequence Length per Bug (B)\n"
                 "(Original contribution: Algorithm 1 finds minimal witnesses)",
                 fontsize=10, fontweight="bold")
    ax.legend(fontsize=9)
    ax.yaxis.grid(True, color=C_GRID, linewidth=0.7)
    ax.set_axisbelow(True)
    ax.set_ylim(0, max(obs_lens) + 3)
    for i, (il, ol) in enumerate(zip(inp_lens, obs_lens)):
        ax.text(i - w/2, il + 0.15, str(il), ha="center", va="bottom", fontsize=9)
        ax.text(i + w/2, ol + 0.15, str(ol), ha="center", va="bottom", fontsize=9)

    fig.tight_layout()
    path = os.path.join(RESULTS_DIR, "witness_lengths.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved → {path}")


# ---------------------------------------------------------------------------
# Figure 3 — State counts: |A_M| and |A_∩|
# ---------------------------------------------------------------------------
def fig_state_counts(results):
    bugged = [r for r in results if r["found"]]
    if not bugged:
        return

    labels    = [f"{r['model']}\n× {r['pattern'].replace('BP','P')}" for r in bugged]
    am_counts = [r["am_states"]    for r in bugged]
    ai_counts = [r["inter_states"] for r in bugged]

    x = np.arange(len(bugged))
    w = 0.35

    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(x - w/2, am_counts, w, label="|A_M| (implementation DFA)",  color="#333333")
    ax.bar(x + w/2, ai_counts, w, label="|A_∩| (intersection DFA)",    color="#AAAAAA")

    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=8)
    ax.set_ylabel("Number of states", fontsize=10)
    ax.set_title("DFA State Counts: Implementation vs Intersection (C)", fontsize=10,
                 fontweight="bold")
    ax.legend(fontsize=9)
    ax.yaxis.grid(True, color=C_GRID, linewidth=0.7)
    ax.set_axisbelow(True)

    fig.tight_layout()
    path = os.path.join(RESULTS_DIR, "state_counts.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved → {path}")


# ---------------------------------------------------------------------------
# Figure 4 — Message flow diagram for Bug 1 witness (original contribution)
# ---------------------------------------------------------------------------
def fig_message_flow(results):
    # Pick BP1 witness from MissingCert model
    target = next(
        (r for r in results
         if r["model"] == "MissingCert" and r["pattern"] == "BP1_MissingCert" and r["found"]),
        None,
    )
    if not target:
        print("No BP1 witness found for flow diagram.")
        return

    observed = target["observed"]

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.set_xlim(0, 10)
    ax.set_ylim(-1, len(observed) + 1)
    ax.axis("off")

    # Swimlane headers
    ax.text(2.5, len(observed) + 0.5, "Tester / Client", ha="center",
            fontsize=11, fontweight="bold")
    ax.text(7.5, len(observed) + 0.5, "SUT / Server",    ha="center",
            fontsize=11, fontweight="bold")
    ax.axvline(5, color="#888888", linewidth=1, linestyle="--")

    from src.sut import INPUTS
    input_set = set(INPUTS)
    y = len(observed) - 1

    for sym in observed:
        is_input = sym in input_set
        if is_input:
            ax.annotate("", xy=(6.5, y), xytext=(3.5, y),
                        arrowprops=dict(arrowstyle="->", color="#111111", lw=1.5))
            ax.text(5, y + 0.15, sym, ha="center", va="bottom", fontsize=9,
                    color="#111111", fontweight="bold")
        else:
            ax.annotate("", xy=(3.5, y), xytext=(6.5, y),
                        arrowprops=dict(arrowstyle="->", color="#555555", lw=1.5))
            ax.text(5, y + 0.15, sym, ha="center", va="bottom", fontsize=9,
                    color="#555555")
        y -= 1

    # Highlight the bug moment: CCS_s appearance
    for idx, sym in enumerate(observed):
        if sym == "CCS_s":
            bug_y = len(observed) - 1 - idx
            ax.axhspan(bug_y - 0.4, bug_y + 0.6, color="#FF000022", zorder=0)
            ax.text(9.8, bug_y + 0.1, "← BUG\nHandshake completed\nwithout Cert",
                    ha="right", va="center", fontsize=8, color="#AA0000")

    ax.set_title(
        "Message Flow: Bug Witness for Missing Certificate (D)\n"
        "Tester sends CertE (empty cert); server incorrectly completes handshake",
        fontsize=10, fontweight="bold", pad=6,
    )
    fig.tight_layout()
    path = os.path.join(RESULTS_DIR, "message_flow.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved → {path}")


def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    results = load()

    print("Generating figures...")
    fig_matrix(results)
    fig_witness_lengths(results)
    fig_state_counts(results)
    fig_message_flow(results)
    print("Done.")


if __name__ == "__main__":
    main()
