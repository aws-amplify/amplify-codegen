import { CodeGenModel, CodeGenModelMap, CodeGenField } from '../visitors/appsync-visitor';
export declare enum CodeGenConnectionType {
    HAS_ONE = "HAS_ONE",
    BELONGS_TO = "BELONGS_TO",
    HAS_MANY = "HAS_MANY"
}
export declare const DEFAULT_HASH_KEY_FIELD = "id";
export declare type CodeGenConnectionTypeBase = {
    kind: CodeGenConnectionType;
    connectedModel: CodeGenModel;
    isConnectingFieldAutoCreated: boolean;
};
export declare type CodeGenFieldConnectionBelongsTo = CodeGenConnectionTypeBase & {
    kind: CodeGenConnectionType.BELONGS_TO;
    targetName: string;
};
export declare type CodeGenFieldConnectionHasOne = CodeGenConnectionTypeBase & {
    kind: CodeGenConnectionType.HAS_ONE;
    associatedWith: CodeGenField;
    targetName: string;
};
export declare type CodeGenFieldConnectionHasMany = CodeGenConnectionTypeBase & {
    kind: CodeGenConnectionType.HAS_MANY;
    associatedWith: CodeGenField;
};
export declare type CodeGenFieldConnection = CodeGenFieldConnectionBelongsTo | CodeGenFieldConnectionHasOne | CodeGenFieldConnectionHasMany;
export declare function makeConnectionAttributeName(type: string, field?: string): string;
export declare function getConnectedField(field: CodeGenField, model: CodeGenModel, connectedModel: CodeGenModel): CodeGenField;
export declare function processConnections(field: CodeGenField, model: CodeGenModel, modelMap: CodeGenModelMap): CodeGenFieldConnection | undefined;
//# sourceMappingURL=process-connections.d.ts.map