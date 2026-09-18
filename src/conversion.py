"""
Mealy Machine → DFA conversion.

Paper reference: Section VI: Definition of A_M.

Given a Mealy machine M = (I, O, Q, q0, delta, lambda), the DFA A_M is
constructed so that L(A_M) equals the set of all input/output sequences that
M can produce.

Construction (auxiliary-state method):
  For each (q, i) with lambda(q, i) = o1 o2 ... on  (n >= 1):
    Introduce auxiliary states  aux(q,i,0), aux(q,i,1), ..., aux(q,i,n-1)
    Delta(q,    i)           = aux(q,i,0)
    Delta(aux(q,i,k), o_k+1) = aux(q,i,k+1)   for k < n-1
    Delta(aux(q,i,n-1), o_n) = delta(q, i)

  For each (q, i) with lambda(q, i) = epsilon:
    Delta(q, i) = delta(q, i)

  All states in Q (not auxiliary) are accepting.
  Undefined transitions → SINK (non-accepting).
"""

from typing import Dict, List, Set, Tuple

from .mealy import MealyMachine
from .dfa import DFA, SINK


def mealy_to_dfa(M: MealyMachine) -> DFA:
    """
    Convert Mealy machine M to DFA A_M as defined in Section VI of the paper.

    A_M accepts exactly the sequences of inputs and outputs that M can produce
    starting from its initial state.
    """
    alphabet = sorted(M.inputs | M.outputs)
    transitions: Dict[Tuple[str, str], str] = {}
    aux_states: Set[str] = set()
    all_states: Set[str] = set(M.states)

    def aux(q: str, i: str, k: int) -> str:
        name = f"__aux_{q}_{i}_{k}__"
        aux_states.add(name)
        return name

    for state in M.states:
        if state == M.sink:
            continue
        for inp in M.inputs:
            output, next_state = M.step(state, inp)

            if len(output) == 0:
                # No output: direct transition on input symbol
                transitions[(state, inp)] = next_state

            elif len(output) == 1:
                # Single output: state -[inp]-> aux0 -[out0]-> next_state
                a0 = aux(state, inp, 0)
                transitions[(state, inp)] = a0
                transitions[(a0, output[0])] = next_state

            else:
                # Multiple outputs: chain of auxiliary states
                a0 = aux(state, inp, 0)
                transitions[(state, inp)] = a0
                for k in range(len(output) - 1):
                    ak = aux(state, inp, k)
                    ak1 = aux(state, inp, k + 1)
                    transitions[(ak, output[k])] = ak1
                last_aux = aux(state, inp, len(output) - 1)
                transitions[(last_aux, output[-1])] = next_state

    # Accepting states: all original Mealy states (not auxiliary, not sink)
    accepting = M.states - {M.sink}

    return DFA(
        states=list(all_states | aux_states),
        alphabet=alphabet,
        initial=M.initial,
        transitions=transitions,
        accepting=accepting,
    )
