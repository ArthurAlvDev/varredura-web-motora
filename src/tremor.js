/* Anti-tremor: filtro de jitter, permanência (dwell) e confirmação por tempo. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Tremor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function distance(a, b) {
    if (!a || !b) return Infinity;
    const dx = Number(a.x) - Number(b.x);
    const dy = Number(a.y) - Number(b.y);
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Mantém um ponto "âncora" e sinaliza estabilidade.
   * Movimentos menores que `radius` são tratados como tremor e ignorados.
   */
  function createFilter(options) {
    const opts = options || {};
    const radius = clamp(opts.radius == null ? 14 : opts.radius, 0, 200);
    let anchor = null;
    let moves = 0;
    let wobbles = 0;

    return {
      radius,
      update(point) {
        if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) {
          return { stable: true, anchor, moved: false };
        }
        const next = { x: Number(point.x), y: Number(point.y) };
        moves += 1;
        if (!anchor) {
          anchor = next;
          return { stable: true, anchor, moved: true };
        }
        if (distance(anchor, next) <= radius) {
          wobbles += 1;
          return { stable: true, anchor, moved: false };
        }
        anchor = next;
        return { stable: true, anchor, moved: true };
      },
      reset() {
        anchor = null;
      },
      stats() {
        return { moves, wobbles, ignoredRatio: moves ? Math.round((wobbles / moves) * 100) / 100 : 0 };
      },
      get anchor() {
        return anchor;
      },
    };
  }

  function progress(startedAt, now, durationMs) {
    const duration = Number(durationMs);
    if (!Number.isFinite(duration) || duration <= 0) return { progress: 1, ready: true, remaining: 0 };
    const elapsed = Math.max(0, Number(now) - Number(startedAt));
    const ratio = Math.min(1, elapsed / duration);
    return {
      progress: Math.round(ratio * 100) / 100,
      ready: ratio >= 1,
      remaining: Math.max(0, Math.round(duration - elapsed)),
    };
  }

  /** Confirmação por permanência: só dispara se o alvo e o tempo se mantiverem. */
  function createDwell(options) {
    const opts = options || {};
    const duration = clamp(opts.durationMs == null ? 1200 : opts.durationMs, 200, 5000);
    const filter = createFilter({ radius: opts.radius == null ? 14 : opts.radius });
    let target = null;
    let startedAt = 0;

    return {
      duration,
      reset() {
        target = null;
        startedAt = 0;
        filter.reset();
      },
      update(targetId, point, now) {
        const move = filter.update(point);
        if (targetId !== target) {
          target = targetId;
          startedAt = Number(now);
          return { target, state: 'started', progress: 0, ready: false, ignored: !move.moved };
        }
        if (!move.moved && move.anchor === null) {
          return { target, state: 'idle', progress: 0, ready: false, ignored: true };
        }
        const state = progress(startedAt, now, duration);
        return {
          target,
          state: state.ready ? 'ready' : 'waiting',
          progress: state.progress,
          remaining: state.remaining,
          ready: state.ready,
          ignored: !move.moved,
        };
      },
      get targetId() {
        return target;
      },
    };
  }

  return { createFilter, createDwell, progress, distance, clamp };
});
