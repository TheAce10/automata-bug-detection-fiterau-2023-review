"""
Bug pattern DFAs for DTLS mutual-authentication handshake bugs.

Paper reference: Section V: "Bug patterns are formalised as DFAs A_b over
Sigma = I U O.  A_b accepts a sequence w iff w provides evidence of the
corresponding bug."

Each DFA is minimal: it tracks only the state needed to decide whether the
sequence exhibits the bug.  Transitions on symbols not mentioned loop back
to the same state (universal catch-all).

Bugs modelled (matching paper Table I / Figs 4–7):
  BP1  Missing Certificate    - server completes HS without Cert from client
  BP2  Missing CertVer        - server completes HS without CertVer from client
  BP3  CertVer before CKE     - server accepts CertVer before CKE
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.dfa import DFA
from src.sut import ALPHABET


def _build_dfa(states, initial, accepting, overrides):
    """
    Build a DFA over ALPHABET with self-loops as default transitions.
    overrides: list of (src, symbol, dst) — replace the self-loop for (src, sym).
    """
    trans = {}
    for state in states:
        for sym in ALPHABET:
            trans[(state, sym)] = state          # default: self-loop
    for (src, sym, dst) in overrides:
        trans[(src, sym)] = dst                  # override
    return DFA(
        states=states,
        alphabet=ALPHABET,
        initial=initial,
        transitions=trans,
        accepting=set(accepting),
    )


# ---------------------------------------------------------------------------
# BP1: Missing Certificate  (paper Fig. 4)
#
# Accepts sequences where CertReq appears, then CCS_s appears, with no Cert
# between them.
#
# States:
#   init     - initial
#   certreq  - CertReq seen; waiting for Cert or CCS_s
#   bug      - CCS_s seen without intervening Cert  (ACCEPTING)
# ---------------------------------------------------------------------------

bp1_missing_cert = _build_dfa(
    states=["init", "certreq", "bug"],
    initial="init",
    accepting=["bug"],
    overrides=[
        ("init",    "CertReq", "certreq"),
        ("certreq", "Cert",    "init"),     # valid cert received — reset
        ("certreq", "CCS_s",   "bug"),      # HS complete, no cert → BUG
    ],
)


# ---------------------------------------------------------------------------
# BP2: Missing CertificateVerify  (paper Fig. 5)
#
# Accepts sequences where Cert appears, then CCS_s appears, with no CertVer
# between them.
#
# States:
#   init   - initial
#   cert   - Cert seen; waiting for CertVer or CCS_s
#   bug    - CCS_s seen without CertVer  (ACCEPTING)
# ---------------------------------------------------------------------------

bp2_missing_certver = _build_dfa(
    states=["init", "cert", "bug"],
    initial="init",
    accepting=["bug"],
    overrides=[
        ("init", "Cert",    "cert"),
        ("cert", "CertVer", "init"),    # CertVer received — reset
        ("cert", "CCS_s",   "bug"),     # HS complete, no CertVer → BUG
    ],
)


# ---------------------------------------------------------------------------
# BP3: CertificateVerify before ClientKeyExchange  (paper Fig. 7)
#
# Accepts sequences where CertVer precedes CKE, and then CCS_s appears.
#
# States:
#   init      - initial
#   certver   - CertVer seen (without prior CKE in this "run")
#   cke_after - CKE seen after CertVer, wrong ordering established
#   bug       - CCS_s seen after the wrong-order pair  (ACCEPTING)
# ---------------------------------------------------------------------------

bp3_certver_before_cke = _build_dfa(
    states=["init", "certver", "cke_after", "bug"],
    initial="init",
    accepting=["bug"],
    overrides=[
        ("init",      "CertVer", "certver"),    # CertVer seen before CKE
        ("init",      "CKE",     "init"),        # CKE first: correct, ignore
        ("certver",   "CKE",     "cke_after"),   # CKE after CertVer: wrong order
        ("certver",   "SH",      "init"),         # renegotiation — reset
        ("cke_after", "CCS_s",   "bug"),          # HS complete with wrong order → BUG
        ("cke_after", "SH",      "init"),
    ],
)


ALL_PATTERNS = {
    "BP1_MissingCert":      bp1_missing_cert,
    "BP2_MissingCertVer":   bp2_missing_certver,
    "BP3_CertVerBeforeCKE": bp3_certver_before_cke,
}
