"""
Bug detection algorithm.

Paper reference: Section V: Algorithm 1

Given the intersection automaton A_∩ = A_M ∩ A_bug, Algorithm 1 performs a
backward BFS from the accepting states of A_∩ to find sequences that both
(a) the learned model M predicts the SUT can produce, and
(b) expose the bug (are accepted by A_bug).

Each candidate sequence is replayed on the actual SUT.  If the SUT's observed
output is also accepted by A_bug, we have a genuine bug witness.  This replay
step filters out false positives introduced by approximation errors in M.

Algorithm 1 (paper, simplified):
  WQ := {(q, ε) : q ∈ F}
  while WQ is non-empty:
      (q, w) := dequeue(WQ)
      if q == q0:
          apply inputs(w) to SUT; let w_obs be the observed sequence
          if w_obs ∈ L(A_bug): return (inputs(w), w_obs)   # bug confirmed
      foreach (q', l) such that Δ(q', l) = q:
          if maxStateVisits(q', l·w, A_∩) ≤ K:
              insert (q', l·w) into WQ

We implement this faithfully, with K configurable (default 2).
"""

from collections import deque, defaultdict
from typing import Dict, List, Optional, Set, Tuple

from .dfa import DFA, SINK
from .sut import SUT


def _inputs_of(sequence: List[str], input_alphabet: Set[str]) -> List[str]:
    """Extract only input symbols from a mixed I/O sequence."""
    return [sym for sym in sequence if sym in input_alphabet]


def _max_state_visits(sequence: List[str], dfa: DFA) -> int:
    """
    Simulate the sequence on dfa and return the maximum number of times
    any single state is visited along the path (loop-detection measure).
    """
    from collections import Counter
    visit: Counter = Counter()
    state = dfa.initial
    visit[state] += 1
    for sym in sequence:
        state = dfa.transition(state, sym)
        if state == SINK:
            break
        visit[state] += 1
    return max(visit.values()) if visit else 0


def detect_bug(
    A_intersect: DFA,
    A_bug: DFA,
    sut: "SUT",
    K: int = 2,
) -> Tuple[bool, Optional[List[str]], Optional[List[str]]]:
    """
    Algorithm 1: backward BFS from accepting states of A_∩.

    Returns:
        (True,  input_sequence, observed_io_sequence)  if a bug is confirmed
        (False, None,           None)                   if no bug found
    """
    if A_intersect.is_empty():
        return False, None, None

    # Build reverse transition map for A_∩
    # reverse_trans[q] = list of (predecessor_state, symbol)
    reverse_trans: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
    for (src, sym), dst in A_intersect.transitions.items():
        if dst != SINK:
            reverse_trans[dst].append((src, sym))

    # Work queue: (state, sequence_w)
    # Invariant: delta*(q, w) reaches an accepting state
    WQ: deque = deque()
    enqueued: Set[Tuple[str, Tuple[str, ...]]] = set()

    def maybe_enqueue(q: str, w: List[str]) -> None:
        key = (q, tuple(w))
        if key not in enqueued:
            enqueued.add(key)
            WQ.append((q, w))

    for acc in A_intersect.accepting:
        maybe_enqueue(acc, [])

    while WQ:
        q, w = WQ.popleft()

        if q == A_intersect.initial:
            # w is a complete candidate sequence from q0 to an accepting state.
            # Extract inputs and replay on the actual SUT.
            inputs_w = _inputs_of(w, sut.input_alphabet)
            observed = sut.query(inputs_w)
            if A_bug.accepts(observed):
                return True, inputs_w, observed
            # If observed not in L(A_bug) it was a false alarm from model approx.
            continue

        # Extend backward: find predecessors
        for (pred, sym) in reverse_trans.get(q, []):
            new_w = [sym] + w
            if _max_state_visits(new_w, A_intersect) <= K:
                maybe_enqueue(pred, new_w)

    return False, None, None
