"""
System Under Test (SUT) — mock DTLS-like protocol implementations.

In the paper, the SUT is a real protocol implementation (OpenSSL, GnuTLS, …)
queried over the network by DTLS-Fuzzer.  Here we simulate both a correct
implementation and three buggy ones that correspond to bugs documented in
the paper (Section VII, Table I).

Protocol: simplified DTLS 1.2 mutual authentication handshake.

Input alphabet I (client → server):
  CH      ClientHello
  Cert    Certificate (non-empty, valid)
  CertE   Certificate (empty — client has no cert)
  CKE     ClientKeyExchange
  CertVer CertificateVerify
  CCS_c   ChangeCipherSpec (client)
  Fin     Finished (client)
  App     ApplicationData

Output alphabet O (server → client):
  HVR     HelloVerifyRequest
  SH      ServerHello + ServerCertificate + ServerKeyExchange
  CertReq CertificateRequest
  SHD     ServerHelloDone
  CCS_s   ChangeCipherSpec (server)
  Fin_s   Finished (server)
  Alert   Alert (connection terminated)
  AppR    ApplicationData response

Correct handshake flow (RFC 6347):
  CH → HVR
  CH → SH, CertReq, SHD
  Cert → (no output)
  CKE  → (no output)
  CertVer → (no output)
  CCS_c → (no output)
  Fin → CCS_s, Fin_s          ← handshake complete
  App → AppR
"""

from typing import Dict, List, Optional, Set, Tuple

INPUTS: List[str] = ["CH", "Cert", "CertE", "CKE", "CertVer", "CCS_c", "Fin", "App"]
OUTPUTS: List[str] = ["HVR", "SH", "CertReq", "SHD", "CCS_s", "Fin_s", "Alert", "AppR"]
ALPHABET: List[str] = INPUTS + OUTPUTS


# ---------------------------------------------------------------------------
# State-machine helpers
# ---------------------------------------------------------------------------

def _run_sm(
    trans: Dict[Tuple[str, str], Tuple[Tuple[str, ...], str]],
    initial: str,
    sink: str,
    sink_output: Tuple[str, ...],
    inputs: List[str],
) -> List[str]:
    """Execute a state-machine over inputs and collect the combined I/O sequence."""
    state = initial
    io: List[str] = []
    for inp in inputs:
        if state == sink:
            out, next_state = sink_output, sink
        else:
            out, next_state = trans.get((state, inp), (sink_output, sink))
        io.append(inp)
        io.extend(out)
        state = next_state
    return io


# ---------------------------------------------------------------------------
# SUT base class
# ---------------------------------------------------------------------------

class SUT:
    """Abstract SUT: given a sequence of inputs, returns the observed I/O trace."""

    name: str = "SUT"
    description: str = ""
    input_alphabet: Set[str] = set(INPUTS)

    def query(self, inputs: List[str]) -> List[str]:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Correct DTLS server (no bugs)
# ---------------------------------------------------------------------------

class CorrectDTLS(SUT):
    """
    Reference implementation: strict DTLS mutual-auth handshake.
    Expected flow: CH→HVR, CH→SH+CertReq+SHD, Cert, CKE, CertVer, CCS_c,
                   Fin→CCS_s+Fin_s, App→AppR.
    Any deviation triggers Alert.
    """
    name = "CorrectDTLS"
    description = "Correct DTLS implementation (no bugs)"

    _SINK = "qSink"
    _INITIAL = "q0"

    # (state, input) -> (output_tuple, next_state)
    _TRANS: Dict[Tuple[str, str], Tuple[Tuple[str, ...], str]] = {
        ("q0",   "CH"):      (("HVR",),            "q1"),
        ("q1",   "CH"):      (("SH","CertReq","SHD"), "q2"),
        ("q2",   "Cert"):    ((),                   "q3"),
        ("q2",   "CertE"):   ((),                   "qCE"),  # empty cert → dead end
        ("q3",   "CKE"):     ((),                   "q4"),
        ("q4",   "CertVer"): ((),                   "q5"),
        ("q5",   "CCS_c"):   ((),                   "q6"),
        ("q6",   "Fin"):     (("CCS_s","Fin_s"),    "q7"),
        ("q7",   "App"):     (("AppR",),             "q7"),
        # qCE: empty cert → always reject
    }

    def query(self, inputs: List[str]) -> List[str]:
        return _run_sm(self._TRANS, self._INITIAL, self._SINK, ("Alert",), inputs)


# ---------------------------------------------------------------------------
# Bug 1 — Missing Certificate
# (OpenSSL / GnuTLS variant documented in paper Table I)
# ---------------------------------------------------------------------------

class BugMissingCert(SUT):
    """
    Buggy implementation: treats an empty Certificate (CertE) identically to a
    valid Certificate (Cert).  The server completes the handshake (sends CCS_s)
    even though the client never provided a real certificate, defeating
    mutual authentication.

    Bug pattern: CertReq → ... → CCS_s   (no Cert between them)
    """
    name = "BugMissingCert"
    description = "Missing Certificate: CertE treated same as Cert (mutual auth bypass)"

    _SINK = "qSink"
    _INITIAL = "q0"

    _TRANS: Dict[Tuple[str, str], Tuple[Tuple[str, ...], str]] = {
        ("q0",   "CH"):      (("HVR",),              "q1"),
        ("q1",   "CH"):      (("SH","CertReq","SHD"), "q2"),
        ("q2",   "Cert"):    ((),                     "q3"),
        ("q2",   "CertE"):   ((),                     "q3"),   # BUG: same path as Cert
        ("q3",   "CKE"):     ((),                     "q4"),
        ("q4",   "CertVer"): ((),                     "q5"),
        ("q5",   "CCS_c"):   ((),                     "q6"),
        ("q6",   "Fin"):     (("CCS_s","Fin_s"),      "q7"),
        ("q7",   "App"):     (("AppR",),               "q7"),
    }

    def query(self, inputs: List[str]) -> List[str]:
        return _run_sm(self._TRANS, self._INITIAL, self._SINK, ("Alert",), inputs)


# ---------------------------------------------------------------------------
# Bug 2 — Missing CertificateVerify
# (MbedTLS / WolfSSL variant documented in paper)
# ---------------------------------------------------------------------------

class BugMissingCertVer(SUT):
    """
    Buggy implementation: the server accepts the handshake without receiving a
    CertificateVerify from the client.  After CKE, the client can jump directly
    to CCS_c without proving possession of the private key.

    Bug pattern: Cert → ... → CCS_s   (no CertVer between them)
    """
    name = "BugMissingCertVer"
    description = "Missing CertificateVerify: client skips proof-of-key-possession"

    _SINK = "qSink"
    _INITIAL = "q0"

    _TRANS: Dict[Tuple[str, str], Tuple[Tuple[str, ...], str]] = {
        ("q0",   "CH"):      (("HVR",),              "q1"),
        ("q1",   "CH"):      (("SH","CertReq","SHD"), "q2"),
        ("q2",   "Cert"):    ((),                     "q3"),
        ("q2",   "CertE"):   ((),                     "qCE"),
        ("q3",   "CKE"):     ((),                     "q4"),
        ("q4",   "CertVer"): ((),                     "q5"),
        ("q4",   "CCS_c"):   ((),                     "q6"),   # BUG: skip CertVer
        ("q5",   "CCS_c"):   ((),                     "q6"),
        ("q6",   "Fin"):     (("CCS_s","Fin_s"),      "q7"),
        ("q7",   "App"):     (("AppR",),               "q7"),
    }

    def query(self, inputs: List[str]) -> List[str]:
        return _run_sm(self._TRANS, self._INITIAL, self._SINK, ("Alert",), inputs)


# ---------------------------------------------------------------------------
# Bug 3 — CertificateVerify before ClientKeyExchange
# (PionDTLS / Scandium variant documented in paper)
# ---------------------------------------------------------------------------

class BugCertVerBeforeCKE(SUT):
    """
    Buggy implementation: the server accepts CertificateVerify before
    ClientKeyExchange, violating the RFC 6347 message ordering.  This can
    allow a client to authenticate with a certificate it does not control.

    Bug pattern: CertVer → CKE → ... → CCS_s  (wrong order)
    """
    name = "BugCertVerBeforeCKE"
    description = "CertVer before CKE: wrong handshake message ordering accepted"

    _SINK = "qSink"
    _INITIAL = "q0"

    _TRANS: Dict[Tuple[str, str], Tuple[Tuple[str, ...], str]] = {
        ("q0",    "CH"):      (("HVR",),              "q1"),
        ("q1",    "CH"):      (("SH","CertReq","SHD"), "q2"),
        ("q2",    "Cert"):    ((),                     "q3"),
        ("q2",    "CertE"):   ((),                     "qCE"),
        # Correct order
        ("q3",    "CKE"):     ((),                     "q4"),
        ("q4",    "CertVer"): ((),                     "q5"),
        # BUG: also accept CertVer before CKE
        ("q3",    "CertVer"): ((),                     "q3cv"),
        ("q3cv",  "CKE"):     ((),                     "q5"),   # CKE after CertVer
        # Rest is shared
        ("q5",    "CCS_c"):   ((),                     "q6"),
        ("q6",    "Fin"):     (("CCS_s","Fin_s"),      "q7"),
        ("q7",    "App"):     (("AppR",),               "q7"),
    }

    def query(self, inputs: List[str]) -> List[str]:
        return _run_sm(self._TRANS, self._INITIAL, self._SINK, ("Alert",), inputs)


ALL_SUTS = [CorrectDTLS(), BugMissingCert(), BugMissingCertVer(), BugCertVerBeforeCKE()]
