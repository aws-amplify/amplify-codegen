import { GraphQLObjectType } from 'graphql';
import { SelectionSet, Selection, Field, FragmentSpread } from '../';
export declare class Variant implements SelectionSet {
  possibleTypes: GraphQLObjectType[];
  selections: Selection[];
  fragmentSpreads: FragmentSpread[];
  constructor(possibleTypes: GraphQLObjectType[], selections?: Selection[], fragmentSpreads?: FragmentSpread[]);
  get fields(): Field[];
  inspect(): string;
}
export declare function typeCaseForSelectionSet(selectionSet: SelectionSet, mergeInFragmentSpreads?: boolean): TypeCase;
export declare class TypeCase {
  default: Variant;
  private variantsByType;
  get variants(): Variant[];
  get defaultAndVariants(): Variant[];
  get remainder(): Variant | undefined;
  get exhaustiveVariants(): Variant[];
  constructor(possibleTypes: GraphQLObjectType[]);
  disjointVariantsFor(possibleTypes: GraphQLObjectType[]): Variant[];
  merge(otherTypeCase: TypeCase, transform?: (selectionSet: SelectionSet) => Selection[]): void;
  inspect(): string;
}
//# sourceMappingURL=typeCase.d.ts.map
