# Induced Electric Charge Distribution
### Physics-Informed Numerical Simulation · AI Role — Project Report

---

## Project Links

| | |
|---|---|
| **Repository** | [github.com/dsainvg/Electric-Charge-Distribution](https://github.com/dsainvg/Electric-Charge-Distribution) |
| **Interactive Demo** | [dev.dsainvg.me/Electric-Charge-Distribution](https://dev.dsainvg.me/Electric-Charge-Distribution/) |

---

## 1. Overview

This project simulates the induced surface charge density on a neutral conducting sphere placed near an external point charge — a classical electrostatics problem with a known exact solution. Rather than looking up the answer, the simulation derives it numerically from first principles by treating charge redistribution as an energy minimisation problem and solving it with constrained gradient descent.

The outcome is validated against the exact analytical result (Legendre series solution), achieving over 97% similarity accuracy. The project spans problem formulation, numerical solver design, hyperparameter tuning, rigorous accuracy evaluation, and interactive visualisation — end-to-end, without external simulation libraries.

---

## 2. What Was Built

### Numerical Optimisation Engine

The sphere surface is discretised into 10,000 points using a Fibonacci lattice — chosen specifically to avoid the polar crowding that plagues uniform grid approaches. Each point carries a charge, initialised to zero, that evolves toward equilibrium through iterative gradient descent.

The optimiser enforces two physical constraints on every step: the sphere stays electrically neutral (total charge sums to zero), and localised charge spikes are penalised to produce smooth, physically realistic distributions. A multi-stage learning-rate schedule — starting coarse and finishing with fine-tuning passes — was critical to crossing the 97% accuracy threshold.

### Analytical Solver & Accuracy Evaluation

The exact induced charge density is computed via a 50-term Legendre series expansion. Because the simulation operates in arbitrary charge units, a principled standardisation step aligns the two distributions before comparison — analogous to z-scoring model predictions before regression evaluation. Accuracy is quantified as both mean absolute error and a relative discrepancy percentage, making the result interpretable regardless of scale.

### Visualisation Suite

Three outputs are generated: a potential energy convergence curve showing monotonic relaxation, a 1D cross-section overlay of simulated versus analytical charge density, and a fully interactive 3D model of the sphere with charge density mapped to colour — explorable in any browser without a Python environment.

---

## 3. Relevance to AI Engineering

The engineering patterns used here map directly onto the day-to-day concerns of an AI or ML engineer:

| In This Project | Direct AI / ML Parallel |
|---|---|
| Constrained gradient descent to reach equilibrium | Neural network training loop — same gradient update structure, same convergence monitoring |
| Charge neutrality constraint via gradient projection | Constrained optimisation in reinforcement learning and structured prediction; mirrors Lagrangian approaches in safe RL |
| L₂ regularisation to prevent charge spikes | Weight decay in deep learning — same mathematical form, same smoothing effect |
| Multi-stage learning-rate schedule | Standard warm-up / cooldown schedules in transformer and diffusion model training |
| Scale-invariant relative discrepancy metric | Normalised RMSE and relative error metrics used in regression benchmarks |
| Precomputed distance matrix cached at startup | Embedding / feature caching in production ML pipelines — trade memory for inference speed |
| Analytical reference solution for ground-truth validation | Unit-test methodology for ML: validate learned outputs against a known correct reference |

---

## 4. Results

| Metric | Value | Notes |
|---|---|---|
| Similarity Accuracy | > 97% | Against exact Legendre series solution |
| Relative Discrepancy | ~3% | Mean absolute error as a fraction of mean analytical magnitude |
| Surface Sample Points | 10,000 | Fibonacci lattice, no polar crowding artefacts |
| Analytical Reference Terms | 50 | Sufficient for full series convergence at the chosen geometry |
| Outputs | 4 artefacts | Convergence curve, 1D comparison plot, static 3D plot, interactive 3D HTML model |

---

## 5. Technical Stack

| Area | Technologies |
|---|---|
| Numerics | NumPy — fully vectorised; no Python loops in the inner optimisation |
| Analytical reference | SciPy — Legendre polynomial evaluation |
| Data handling | Pandas for structured results; pickle for precomputed target caching |
| Visualisation | Matplotlib for static publication-quality plots; Plotly for interactive 3D HTML |
| Reproducibility | Pinned dependencies; modular package structure; precomputation script for offline use |

---

## 6. Key Engineering Decisions

- **Fibonacci lattice over a uniform grid** — eliminates polar singularities that would corrupt the charge distribution near the poles, a non-obvious choice that required understanding the geometry of spherical discretisation.

- **Pairwise distance matrix computed once at startup** — avoids quadratic-cost recomputation on every iteration; the standard memory-vs-speed trade-off in batch gradient methods.

- **Mean-centering gradient for the neutrality constraint** — a lightweight operation that enforces the physical constraint exactly, without a penalty term that would require additional tuning.

- **Multi-stage learning-rate schedule** — a single fixed rate could not achieve >95% accuracy; the coarse-to-fine schedule mirrors best practice from large-model training.

- **Standardised comparison metric** — raw charge units are arbitrary, so the analytical solution is rescaled to match the simulation's statistics before evaluation. Without this, the accuracy number would be meaningless.

---

Full source available at [github.com/dsainvg/Electric-Charge-Distribution](https://github.com/dsainvg/Electric-Charge-Distribution)
