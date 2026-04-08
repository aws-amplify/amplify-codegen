// TypeScript 4.7 does not ship the standard Disposable globals that newer
// graphql-tools type declarations reference. This package does not use those
// contracts directly, so lightweight ambient declarations keep the package
// buildable until the repo's TypeScript floor moves forward.
interface Disposable {}

interface AsyncDisposable {}
