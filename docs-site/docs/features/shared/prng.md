---
sidebar_position: 3
sidebar_label: "prng"
---

# Feature: `shared/prng`

## What this feature does

The `prng` (Pseudo-Random Number Generator) module provides a pure, mathematical service for generating deterministic pseudo-random variables. It uses the FNV-1a hashing algorithm to convert string seeds into 32-bit integers, and the Fisher-Yates algorithm to shuffle arrays in a strict, predictable order.

## Why this feature exists

The standard `Math.random()` method in JavaScript is non-deterministic and cannot be seeded. In game engines and simulations, determinism is absolutely critical for procedural generation, replay systems (such as the framework's `DVRService`), and multiplayer state synchronization. This module solves that architectural problem by guaranteeing that the exact same seed will always produce the exact same output, regardless of the platform, browser, or execution order.

## How it works

1. **Instantiation:** A developer creates an instance of the `PRNG` class.
2. **Hashing (`hash`):** When a string seed is passed, the algorithm iterates over each character, applying a bitwise XOR (`^`) with the current hash value and multiplying the result by the `FNV_PRIME` constant (`0x01000193`). This produces a stable 32-bit unsigned integer.
3. **Shuffling (`shuffle`):** The method accepts a source array and a seed. It creates a shallow copy of the array, calculates the base hash of the seed, and then iterates through the copy using the Fisher-Yates algorithm. On each iteration, it recalculates the hash and normalizes it to predictably select an index for swapping.

## Interesting design decisions

### 1) Zero Dependencies (Absolute Isolation)

The `prng.ts` file contains absolutely zero imports. It knows nothing about the framework's abstractions, Entities, Pipelines, or Components. This makes it a textbook example of "pure infrastructure" residing in the `shared` layer.

### 2) Immutability During Shuffling

The `shuffle` method intentionally does not mutate the original array passed in the arguments. Instead, it creates a shallow copy (`const result = [...array]`) and shuffles that.
_Result:_ This prevents subtle bugs and implicit side effects in game Systems, where the original array order might be relied upon by other concurrent logic.

### 3) Bitwise Normalization for Cross-Engine Stability

The private `normalize` method applies a zero-fill right shift (`>>> 0`) before dividing by `0x100000000`.
_Result:_ This forces the JavaScript engine to treat the number strictly as an unsigned 32-bit integer. It protects the determinism from platform-dependent bugs related to sign extension, ensuring identical behavior in V8 (Chrome/Node), SpiderMonkey (Firefox), and JavaScriptCore (Safari).

## Public contracts in this feature

- **Classes:** `PRNG`.
- **Methods:** - `hash(seed: string): number`.
    - `shuffle<T>(array: T[], seed: string): T[]`.

## Current scope and boundaries

- **Domain Boundaries:** The module contains strictly mathematical and deterministic logic. It manages no game entities and holds no global state.
- **Input Boundaries:** The generator is explicitly designed to work with string seeds (`string`), rather than numeric ones. This makes it easier to generate random values based on human-readable contexts (e.g., `hash('level-1-spawn-point')`).
- **Dependency Limits:** Residing in the `shared` layer, the module is strictly forbidden from importing from `core`, `widgets`, or any higher-level layers.

