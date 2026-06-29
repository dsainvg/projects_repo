# ORCH — Agent Graph Orchestration Language
### Project Report · Durga Sai

---

## All Project Links

| Resource | URL |
|---|---|
| Main Repository (Compiler) | https://github.com/dsainvg/software_eng_lab_project |
| Ecosystem Announcement | https://github.com/dsainvg/software_eng_lab_project/discussions/60 |
| Runtime Library | https://github.com/dsainvg/orch-lib |
| PyPI Package | https://pypi.org/project/orch-lib/ |
| VS Code Extension (Source) | https://github.com/dsainvg/orch-vscode-extension |
| VS Code Marketplace | https://marketplace.visualstudio.com/items?itemName=dsainvg.orch-dsl-language-support |
| Open VSX Registry | https://open-vsx.org/extension/dsainvg/orch-dsl-language-support |
| Live Documentation | https://dsainvg.github.io/documentation-aeon/ |
| Documentation Source | https://github.com/dsainvg/documentation-aeon |

---

## What Is ORCH?

ORCH is a custom programming language designed from scratch for building and orchestrating systems made up of multiple intelligent agents. Rather than gluing existing frameworks together, this project involved designing the language itself — its grammar, its rules, how programs written in it get compiled, and how they ultimately run.

The core idea is that complex systems are often made up of many independent agents, each doing a specific job, with some central logic deciding which agent should act and when. ORCH gives developers a clean, purpose-built way to express exactly that — who the agents are, what tasks they perform, what they remember, and how control flows between them.

The project was built end-to-end: from the language specification through to a compiler, a runtime execution engine, a published installable package, an IDE extension live on the VS Code marketplace, and full user-facing documentation.

---

## What Was Built

### The Language and Compiler

The compiler is the heart of the project. When a developer writes a program in ORCH, this is the piece of software that reads it, checks it for errors, understands its meaning, and converts it into something a machine can execute.

Building a compiler from scratch is a significant engineering undertaking. It was written in OCaml — a language well-suited to this kind of symbolic processing — and goes through four distinct stages: reading the raw text character by character and recognising meaningful units, assembling those units into a structured representation of the program's logic, checking that the program is semantically valid (for instance, that variables are used in the right places and with the right types), and finally generating executable output from that structure.

The compiler ships with four complete working example programs — an auction system, a number-guessing game, a tic-tac-toe game, and a traffic light simulation — which demonstrate the language working end-to-end across different kinds of problems. It has gone through four versioned releases, and every stage of the compiler is covered by a comprehensive automated test suite.

---

### The Runtime Library

A compiled ORCH program needs something to actually run it. The runtime library is a Python package that serves as the execution engine — it takes the output of the compiler and brings it to life.

It handles all the complexity that agent systems introduce: making sure each agent has its own private memory that others cannot touch, managing memory that is intentionally shared across the whole system, coordinating which agents run and in what order based on real-time conditions, and supporting the ability to spin up multiple independent copies of the same agent running in parallel.

This library is publicly distributed — anyone can install it with a single command — and has gone through eight releases, each refining the execution model. The automated publishing pipeline means new versions go out without manual intervention.

---

### The VS Code Extension

To make writing ORCH programs feel professional rather than like working in a plain text editor, a full IDE extension was built and published to the VS Code Marketplace as well as the Open VSX Registry (which serves open-source editor alternatives).

The extension gives developers the same quality of experience they would expect from a mature language. As they type, the editor understands the ORCH language well enough to highlight syntax meaningfully, suggest completions, underline errors in real time, show documentation when hovering over keywords, and let developers jump directly to where something is defined. It also understands the Python code that developers embed inside ORCH programs, running Python-specific checks on that code as well.

Publishing to two separate registries ensures the tooling is accessible to the widest possible audience regardless of which editor they use.

---

### The Documentation

A complete documentation site was written and deployed for users of the language. It covers the full scope of ORCH from first installation through to advanced usage — the structure of programs, how agents are defined, how memory scoping works, how routing is configured, and what the built-in capabilities of the language are.

The documentation is structured as a guided reading path so a new user can go from zero to writing their first ORCH program in a logical sequence. It is hosted publicly and versioned alongside the rest of the project.

---

## The Bigger Picture

What makes this project notable as an engineering effort is its scope and cohesion. Most student projects touch one layer of a system. This one built the full vertical: a language, the tooling to compile it, the engine to run it, the IDE integration to write it comfortably, and the documentation to learn it — all released publicly, all automated, all working together.

The design decisions in the language itself also reflect genuine thought about the problem. Centralising routing logic means a reader can understand a program's overall flow at a glance rather than tracing through individual agents. Giving developers a clean escape hatch to write unrestricted Python inside their ORCH programs means the language never becomes a constraint. The memory model — where you simply declare whether something is private to an agent or shared across the system — removes an entire category of complexity that usually requires message queues or event buses.

---

## Technology Overview

The compiler was written in OCaml. The runtime library and execution engine are in Python. The IDE extension is in TypeScript. Automated pipelines handle building, testing, and publishing across all three. The language itself supports integer, float, character, string, list, and tuple types, with type checking enforced at compile time before a program ever runs.

---

## Author

**Durga Sai**  
dsainvg.20.12@gmail.com  
https://github.com/dsainvg

*Software Engineering Lab Project — Group 30*
