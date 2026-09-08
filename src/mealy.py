"""
Mealy Machine implementation.

Paper reference: Section VI — "Models of protocol implementations are
assumed to be given as Mealy machines describing how the implementation
generates output messages in response to input messages."

A Mealy machine M = (I, O, Q, q0, delta, lambda) where:
  I   = finite input alphabet
  O   = finite output alphabet
  Q   = finite set of states
  q0  = initial state
  delta : Q x I -> Q            (transition function)
  lambda: Q x I -> O*           (output function — sequence of symbols)
"""

from collections import defaultdict
from typing import Dict, List, Tuple, Set, Optional


class MealyMachine:
    def __init__(
        self,
        states: List[str],
        inputs: List[str],
        outputs: List[str],
        initial: str,
        transitions: Dict[Tuple[str, str], str],
        output_fn: Dict[Tuple[str, str], Tuple[str, ...]],
        sink: str = "qSink",
        sink_output: Tuple[str, ...] = ("Alert",),
    ):
        self.states = set(states) | {sink}
        self.inputs = set(inputs)
        self.outputs = set(outputs)
        self.initial = initial
        self.transitions = dict(transitions)
        self.output_fn = {k: tuple(v) for k, v in output_fn.items()}
        self.sink = sink
        self.sink_output = tuple(sink_output)

    def step(self, state: str, inp: str) -> Tuple[Tuple[str, ...], str]:
        """Return (output_sequence, next_state) for one step."""
        if state == self.sink:
            return self.sink_output, self.sink
        key = (state, inp)
        next_state = self.transitions.get(key, self.sink)
        output = self.output_fn.get(key, self.sink_output)
        return output, next_state

    def run(self, input_sequence: List[str]) -> List[str]:
        """
        Run input_sequence from the initial state.
        Returns the combined I/O sequence: i1, o1a, o1b, ..., i2, o2a, ...
        """
        state = self.initial
        io_seq: List[str] = []
        for inp in input_sequence:
            output, next_state = self.step(state, inp)
            io_seq.append(inp)
            io_seq.extend(output)
            state = next_state
        return io_seq

    def to_dot(self, name: str = "M") -> str:
        """Export to Graphviz DOT format."""
        lines = [
            f"digraph {name} {{",
            "  rankdir=LR;",
            '  node [shape=circle fontname="Arial" fontsize=11];',
            '  edge [fontname="Arial" fontsize=9];',
            "  __start__ [shape=point];",
            f"  __start__ -> {self.initial};",
        ]
        for state in sorted(self.states):
            if state == self.sink:
                lines.append(
                    f'  {state} [label="{state}" style=filled fillcolor=lightgrey];'
                )
            else:
                lines.append(f'  {state} [label="{state}"];')

        edge_labels: Dict[Tuple[str, str], List[str]] = defaultdict(list)
        for (src, inp), dst in self.transitions.items():
            out = self.output_fn.get((src, inp), self.sink_output)
            out_str = "/".join(out) if out else "ε"
            edge_labels[(src, dst)].append(f"{inp} / {out_str}")

        for (src, dst), labels in sorted(edge_labels.items()):
            label = "\\n".join(sorted(labels))
            lines.append(f'  {src} -> {dst} [label="{label}"];')

        lines.append("}")
        return "\n".join(lines)
