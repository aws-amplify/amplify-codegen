import { Types, PluginFunction as PluginFunctionAsync, CodegenPlugin as CodegenPluginAsync } from "@graphql-codegen/plugin-helpers";

type PluginMapContainer = Pick<Types.GenerateOptions, 'pluginMap'>;
type CacheContainer = Pick<Types.GenerateOptions, 'cache'>;

/**
 * SyncPluginMap replaces the plugin function return type for all plugins in the plugin map
 *   The object attribute we need to operate on is: Obj['pluginMap'][string]['plugin']
 *   Use Omit to remove and & to replace each object layer
 */
type SyncPluginMap<Obj extends PluginMapContainer> = Omit<Obj, 'pluginMap'> & {
    pluginMap: {
        [K in keyof Obj['pluginMap']]: Omit<Obj['pluginMap'][K], 'plugin'> & {
            plugin: (
                ...args: Parameters<Obj['pluginMap'][K]['plugin']>
            ) => Awaited<ReturnType<Obj['pluginMap'][K]['plugin']>>;
        }
    };
};

/**
 * SyncCache replaces the cache function return type
 *   The object attribute we need to operate on is: Obj['cache']
 *   Use Omit to remove and & to replace the object layer
 */
type SyncCache<Obj extends CacheContainer> = Omit<Obj, 'cache'> & {
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