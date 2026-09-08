"""
DFA intersection via cross-product construction.

Paper reference: Section IV — A_∩ = A_M ∩ A_bug

A_∩ = (Sigma, Q_M x Q_b, (q0_M, q0_b), Delta', Q_M x F_b)

where:
  Delta'((qM, qb), l) = (Delta_M(qM, l), Delta_b(qb, l))
  Accepting states: Q_M x F_b  (i.e., A_M accepts AND A_bug accepts)

Sequences accepted by A_∩ are precisely those that:
  (1) M can produce  (i.e., are valid I/O traces of the implementation), AND
  (2) expose the bug  (i.e., are accepted by the bug pattern DFA A_b).
"""

from typing import Dict, Set, Tuple

from .dfa import DFA, SINK


def intersect(A_M: DFA, A_bug: DFA) -> DFA:
    """
    Return A_M ∩ A_bug using the cross-product construction.

    The result is trimmed to remove unreachable states and states from
    which no accepting state is reachable.
    """
    alphabet = A_M.alphabet & A_bug.alphabet

    # States of A_∩ are pairs (qM, qb)
    def pair(qm: str, qb: str) -> str:
        return f"({qm},{qb})"

    initial = pair(A_M.initial, A_bug.initial)
    transitions: Dict[Tuple[str, str], str] = {}
    accepting: Set[str] = set()

    # BFS exploration of reachable product states
    from collections import deque
    visited: Set[str] = set()
    queue: deque = deque()

    def enqueue(qm: str, qb: str) -> str:
        p = pair(qm, qb)
        if p not in visited:
            visited.add(p)
            queue.append((qm, qb, p))
        return p

    enqueue(A_M.initial, A_bug.initial)

    while queue:
        qm, qb, p = queue.popleft()
        if qb in A_bug.accepting:
            accepting.add(p)

        for sym in sorted(alphabet):
            nxt_m = A_M.transition(qm, sym)
            nxt_b = A_bug.transition(qb, sym)
            if nxt_m == SINK or nxt_b == SINK:
                continue
            nxt_p = enqueue(nxt_m, nxt_b)
            transitions[(p, sym)] = nxt_p

    result = DFA(
        states=list(visited),
        alphabet=list(alphabet),
        initial=initial,
        transitions=transitions,
        accepting=accepting,
    )
    return result.trim()
