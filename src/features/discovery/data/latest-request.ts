export type LatestRequestHandlers<T> = {
  resolve(value: T): void;
  reject(error: unknown): void;
};
/**
 * @returns One cancellable request lane; stale responses are ignored even if a
 * source ignores AbortSignal or resolves after cancellation.
 */
export function createLatestRequest<T>() {
  let generation = 0;
  let active: AbortController | null = null;
  const cancel = () => {
    generation += 1;
    active?.abort();
    active = null;
  };
  return {
    cancel,
    run(
      load: (signal: AbortSignal) => Promise<T>,
      handlers: LatestRequestHandlers<T>,
    ): () => void {
      cancel();
      const version = generation;
      const controller = new AbortController();
      active = controller;
      const current = () =>
        version === generation && !controller.signal.aborted;
      void Promise.resolve()
        .then(() => {
          if (current()) return load(controller.signal);
        })
        .then(
          (value) => {
            if (current()) handlers.resolve(value as T);
          },
          (error: unknown) => {
            if (current()) handlers.reject(error);
          },
        );
      return () => {
        if (version === generation) cancel();
      };
    },
  };
}
