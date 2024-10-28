import { createNoopProfiler } from "../profiler";

describe('createNoopProfiler', () => {
    test('a provided profiler is executed', () => {
        const profiler = createNoopProfiler()
        let wasExecuted = false;
        expect(profiler).toBeDefined();

        profiler.run(() => {
            wasExecuted = true
        }, "Test");

        expect(wasExecuted).toBe(true);
        expect(profiler.collect()).toEqual([]);
    })
})