import { ProfilerEvent } from "@graphql-codegen/plugin-helpers";

interface Profiler {
    run<T>(fn: () => T, name: string, cat?: string): T;
    collect(): ProfilerEvent[];
}
export function createNoopProfiler(): Profiler {
    return {
        run(fn) {
            return fn();
        },
        collect() {
            return [];
        },
    };
};