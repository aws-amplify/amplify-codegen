import { Types, PluginFunction as PluginFunctionAsync, CodegenPlugin as CodegenPluginAsync } from "@graphql-codegen/plugin-helpers";

type PluginMapContainer = Pick<Types.GenerateOptions, 'pluginMap'>;
type CacheContainer = Pick<Types.GenerateOptions, 'cache'>;

export type SyncPluginMap<Obj extends PluginMapContainer> = Omit<Obj, 'pluginMap'> & {
    pluginMap: {
        [name: string]: Omit<Obj['pluginMap'][string], 'plugin'> & {
        plugin: (
            ...args: Parameters<Obj['pluginMap'][string]['plugin']>
        ) => Awaited<ReturnType<Obj['pluginMap'][string]['plugin']>>;
        };
    };
};

export type SyncCache<Obj extends CacheContainer> = Omit<Obj, 'cache'> & {
    cache?: (<T>(namespace: string, key: string, factory: () => T) => T) | undefined
};

/**
 * @internal
 */
export declare namespace SyncTypes {
    type GenerateOptions = SyncCache<SyncPluginMap<Types.GenerateOptions>>;

    type PresetFnArgs<
        Config = any,
        PluginConfig = {
        [key: string]: any;
        }
    > = SyncCache<SyncPluginMap<Types.PresetFnArgs<Config, PluginConfig>>>;

    type OutputPreset<TPresetConfig = any> = {
        buildGeneratesSection: (options: PresetFnArgs<TPresetConfig>) => GenerateOptions[];
    };

    type PluginFunction<T> = (...args: Parameters<PluginFunctionAsync<T>>) => Awaited<ReturnType<PluginFunctionAsync<T>>>;

    type CodegenPlugin<T = any> = Omit<CodegenPluginAsync<T>, 'plugin'> & {
        plugin: PluginFunction<T>;
    }

    // Reiterating these types so that SyncTypes is a drop in replacement for Types
    type DocumentFile = Types.DocumentFile;
    type PluginConfig = Types.PluginConfig;
    type ConfiguredPlugin = Types.ConfiguredPlugin;
    type SkipDocumentsValidationOptions = Types.SkipDocumentsValidationOptions;
    type PluginOutput = Types.PluginOutput
};