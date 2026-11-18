Run `node --experimental-strip-types tests/sediment.mjs` with Node 22.13 or newer.

Checks conservation across periodic boundaries, nonnegative heights, repose tolerance (2 cm between sampled neighbours), calm threshold, reset, cardinal wind response, smaller-mound migration, and periodic boundary transport. These are numerical invariants and qualitative checks, not field-data validation or a calibration to calendar time.


Rendering checks: `node --experimental-strip-types tests/rendering.mjs`. These exercise the actual renderer with an instrumented graphics context: unchanged views, five updates per second, full-rate camera turns, altitude/view transitions, resize, hidden tabs, grain view and cleanup. No terrain geometry, shading samples or default pixel density are reduced.

CPU benchmark: `node --experimental-strip-types tests/performance.mjs`. Compare startup and 30 steady / 30 strong-variable model steps on the same machine, with no other benchmark running. Topology caching adds a 1 MiB fixed neighbour table and removes per-pair coordinate work from the avalanche loop.


Fast forward: `node --experimental-strip-types tests/fast-forward.mjs` checks actual terrain evolution, conservation, nonnegative heights and repose under steady, strong and changing winds. It also checks all three grid spacings, the initial volume at each sand setting, and extended fast-forward steps. `tests/playback.mjs` verifies nominal model-time accounting, detailed low-speed steps, bounded batches, pause/reset and the separate grain clock. Above 20 cy/s, larger transport steps are an explicit approximation; fast-forward cycle counts represent integrated model time, not individually executed detailed solves.

Run `node --experimental-strip-types tests/long-run.mjs` for the slower landscape regression. It replays strong automatically varying winds with a mean bearing of 340° through 33,528 model cycles. At four checkpoints it verifies the sand budget and counts summits at least 10 m high that are local maxima within 90 m and stand at least 8 m above a point on the surrounding ring. The minimum count is a regression guard for this seeded landscape.
