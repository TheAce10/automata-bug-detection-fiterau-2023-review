"""
Mealy machine models of the DTLS-like protocol implementations.

Each model is constructed to match the corresponding SUT in sut.py so that
Algorithm 1 can use the model to predict candidate bug witnesses, then confirm
them by replaying on the actual SUT.

In the paper, these models are obtained via active automata learning (L*/TTT).
Here they are constructed analytically to focus the replication on the
core bug-detection algorithm (Sections IV–VI) rather than the learning
phase (Section III).
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.mealy import MealyMachine
from src.sut import INPUTS, OUTPUTS


def _make(trans_list, name):
    """Build a MealyMachine from a list of (state, input, output_list, next_state)."""
    transitions = {}
    output_fn = {}
    states = set()
    for (src, inp, out, dst) in trans_list:
        transitions[(src, inp)] = dst
        output_fn[(src, inp)] = tuple(out)
        states.add(src)
        states.add(dst)
    return MealyMachine(
        states=list(states),
        inputs=INPUTS,
        outputs=OUTPUTS,
        initial="q0",
        transitions=transitions,
        output_fn=output_fn,
        sink="qSink",
        sink_output=("Alert",),
    )


# ---------------------------------------------------------------------------
# Correct model
# ---------------------------------------------------------------------------

CORRECT_TRANS = [
    ("q0",   "CH",      ["HVR"],               "q1"),
    ("q1",   "CH",      ["SH","CertReq","SHD"], "q2"),
    ("q2",   "Cert",    [],                     "q3"),
    ("q2",   "CertE",   [],                     "qCE"),
    ("q3",   "CKE",     [],                     "q4"),
    ("q4",   "CertVer", [],                     "q5"),
    ("q5",   "CCS_c",   [],                     "q6"),
    ("q6",   "Fin",     ["CCS_s","Fin_s"],       "q7"),
    ("q7",   "App",     ["AppR"],                "q7"),
]

model_correct = _make(CORRECT_TRANS, "CorrectModel")


# ---------------------------------------------------------------------------
# Buggy model 1: Missing Certificate
# ---------------------------------------------------------------------------

BUG1_TRANS = [
    ("q0",   "CH",      ["HVR"],               "q1"),
    ("q1",   "CH",      ["SH","CertReq","SHD"], "q2"),
    ("q2",   "Cert",    [],                     "q3"),
    ("q2",   "CertE",   [],                     "q3"),   # BUG
    ("q3",   "CKE",     [],                     "q4"),
    ("q4",   "CertVer", [],                     "q5"),
    ("q5",   "CCS_c",   [],                     "q6"),
    ("q6",   "Fin",     ["CCS_s","Fin_s"],       "q7"),
    ("q7",   "App",     ["AppR"],                "q7"),
]

model_missing_cert = _make(BUG1_TRANS, "MissingCertModel")


# ---------------------------------------------------------------------------
# Buggy model 2: Missing CertificateVerify
# ---------------------------------------------------------------------------

BUG2_TRANS = [
    ("q0",   "CH",      ["HVR"],               "q1"),
    ("q1",   "CH",      ["SH","CertReq","SHD"], "q2"),
    ("q2",   "Cert",    [],                     "q3"),
    ("q2",   "CertE",   [],                     "qCE"),
    ("q3",   "CKE",     [],                     "q4"),
    ("q4",   "CertVer", [],                     "q5"),
    ("q4",   "CCS_c",   [],                     "q6"),   # BUG: skip CertVer
    ("q5",   "CCS_c",   [],                     "q6"),
    ("q6",   "Fin",     ["CCS_s","Fin_s"],       "q7"),
    ("q7",   "App",     ["AppR"],                "q7"),
]

model_missing_certver = _make(BUG2_TRANS, "MissingCertVerModel")


# ---------------------------------------------------------------------------
# Buggy model 3: CertVer before CKE
# ---------------------------------------------------------------------------

BUG3_TRANS = [
    ("q0",    "CH",      ["HVR"],               "q1"),
    ("q1",    "CH",      ["SH","CertReq","SHD"], "q2"),
    ("q2",    "Cert",    [],                     "q3"),
    ("q2",    "CertE",   [],                     "qCE"),
    ("q3",    "CKE",     [],                     "q4"),
    ("q4",    "CertVer", [],                     "q5"),
    ("q3",    "CertVer", [],                     "q3cv"),  # BUG: CertVer before CKE
    ("q3cv",  "CKE",     [],                     "q5"),
    ("q5",    "CCS_c",   [],                     "q6"),
    ("q6",    "Fin",     ["CCS_s","Fin_s"],       "q7"),
    ("q7",    "App",     ["AppR"],                "q7"),
]

model_certver_before_cke = _make(BUG3_TRANS, "CertVerBeforeCKEModel")


ALL_MODELS = {
    "Correct":          model_correct,
    "MissingCert":      model_missing_cert,
    "MissingCertVer":   model_missing_certver,
    "CertVerBeforeCKE": model_certver_before_cke,
}
