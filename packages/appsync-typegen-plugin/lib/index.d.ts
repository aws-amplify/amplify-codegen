import { RawDocumentsConfig } from '@graphql-codegen/visitor-plugin-common';
export interface AppSyncTypePluginConfig extends RawDocumentsConfig {
    directives?: string;
}
export * from './plugin';
export * from './preset';
export declare const addToSchema: (config: AppSyncTypePluginConfig) => string;
//# sourceMappingURL=index.d.ts.map