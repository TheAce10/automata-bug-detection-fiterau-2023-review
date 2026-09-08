"""
Deterministic Finite Automaton implementation.

Paper reference: Section IV — "Bug patterns are formalised as DFAs A_b over
the combined input/output alphabet I U O.  A_b accepts a sequence w iff w
exhibits the corresponding bug."

A DFA A = (Sigma, Q, q0, Delta, F) where:
  Sigma = finite alphabet (I U O for bug patterns)
  Q     = finite set of states
  q0    = initial state
  Delta : Q x Sigma -> Q   (total; undefined transitions go to SINK)
  F     = set of accepting states
"""

from collections import defaultdict, deque
from typing import Dict, List, Optional, Set, Tuple


SINK = "__SINK__"


class DFA:
    def __init__(
        self,
        states: List[str],
        alphabet: List[str],
        initial: str,
        transitions: Dict[Tuple[str, str], str],
        accepting: Set[str],
    ):
        self.states: Set[str] = set(states) | {SINK}
        self.alphabet: Set[str] = set(alphabet)
        self.initial: str = initial
        self.transitions: Dict[Tuple[str, str], str] = dict(transitions)
        self.accepting: Set[str] = set(accepting)

    def transition(self, state: str, symbol: str) -> str:
        """Return next state (SINK if undefined)."""
        if state == SINK:
            return SINK
        return self.transitions.get((state, symbol), SINK)

    def accepts(self, sequence: List[str]) -> bool:
        """Return True iff the DFA accepts the given sequence."""
        state = self.initial
        for sym in sequence:
            state = self.transition(state, sym)
        return state in self.accepting

    # ------------------------------------------------------------------
    # Reachability helpers used by intersection and detection
    # ------------------------------------------------------------------

    def reachable_states(self) -> Set[str]:
        """BFS from initial state; returns all reachable non-SINK states."""
        visited: Set[str] = set()
        queue = deque([self.initial])
        while queue:
            q = queue.popleft()
            if q in visited or q == SINK:
                continue
            visited.add(q)
            for sym in self.alphabet:
                nxt = self.transition(q, sym)
                if nxt not in visited:
                    queue.append(nxt)
        return visited

    def co_reachable_states(self) -> Set[str]:
        """States from which an accepting state is reachable (backward BFS)."""
        # Build reverse graph over reachable states
        reachable = self.reachable_states()
        reverse: Dict[str, Set[str]] = defaultdict(set)
        for q in reachable:
            for sym in self.alphabet:
                nxt = self.transition(q, sym)
                if nxt in reachable:
                    reverse[nxt].add(q)

        co_reach: Set[str] = set()
        queue = deque(q for q in self.accepting if q in reachable)
        while queue:
            q = queue.popleft()
            if q in co_reach:
                continue
            co_reach.add(q)
            for pred in reverse.get(q, set()):
                if pred not in co_reach:
                    queue.append(pred)
        return co_reach

    def is_empty(self) -> bool:
        """Return True iff L(A) = ∅ (no accepting state is reachable)."""
        return len(self.co_reachable_states()) == 0 or self.initial not in self.co_reachable_states()

    def trim(self) -> "DFA":
        """Return the trimmed DFA (only live states)."""
        live = self.reachable_states() & self.co_reachable_states()
        if not live:
            # Empty language — single non-accepting state
            return DFA(
                states=[self.initial],
                alphabet=list(self.alphabet),
                initial=self.initial,
                transitions={},
                accepting=set(),
            )
        new_trans = {
            (q, s): nxt
            for (q, s), nxt in self.transitions.items()
            if q in live and nxt in live
        }
        return DFA(
            states=list(live),
            alphabet=list(self.alphabet),
            initial=self.initial if self.initial in live else next(iter(live)),
            transitions=new_trans,
            accepting=self.accepting & live,
        )

    # ------------------------------------------------------------------
    # Shortest accepting word (BFS forward)
    # ------------------------------------------------------------------

    def shortest_accepted_word(self) -> Optional[List[str]]:
        """
        Return the shortest word in L(A), or None if L(A) = ∅.
        Used by Algorithm 1 to extract bug witnesses.
        """
        if self.is_empty():
            return None

        # BFS: (state, path_so_far)
        queue: deque = deque([(self.initial, [])])
        visited: Set[str] = {self.initial}

        while queue:
            state, path = queue.popleft()
            if state in self.accepting:
                return path
            for sym in sorted(self.alphabet):
                nxt = self.transition(state, sym)
                if nxt != SINK and nxt not in visited:
                    visited.add(nxt)
                    queue.append((nxt, path + [sym]))

        return None

    def to_dot(self, name: str = "A") -> str:
        """Export to Graphviz DOT format."""
        lines = [
            f"digraph {name} {{",
            "  rankdir=LR;",
            '  node [fontname="Arial" fontsize=11];',
            '  edge [fontname="Arial" fontsize=9];',
            "  __start__ [shape=point];",
            f"  __start__ -> {self.initial};",
        ]
        reach = self.reachable_states()
        for state in sorted(reach):
            shape = "doublecircle" if state in self.accepting else "circle"
            lines.append(f'  {state} [shape={shape} label="{state}"];')

        edge_labels: Dict[Tuple[str, str], List[str]] = defaultdict(list)
        for (src, sym), dst in self.transitions.items():
            if src in reach and dst in reach:
                edge_labels[(src, dst)].append(sym)

        for (src, dst), syms in sorted(edge_labels.items()):
            label = ", ".join(sorted(syms))
            lines.append(f'  {src} -> {dst} [label="{label}"];')

        lines.append("}")
        return "\n".join(lines)
