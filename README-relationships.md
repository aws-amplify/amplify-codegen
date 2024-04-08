# Modeling relationships in the introspection schema

## Background

The Model Introspection Schema (MIS) is an intermediate representation of the GraphQL model that includes Amplify annotations. It is different
from the standard [GraphQL introspection schema](https://graphql.org/learn/introspection/) in that it includes relationship information, not
just type information.

> **NOTE:** The MIS is an internal implementation detail of the Amplify API plugin. It should not be used in a customer application.

## Sample

Given a schema like

```graphql
type Primary @model @auth(rules: [{ allow: public, operations: [read] }, { allow: owner }]) {
  id: ID! @primaryKey
  relatedMany: [RelatedMany] @hasMany(references: "primaryId")
  relatedOne: RelatedOne @hasOne(references: "primaryId")
}

type RelatedMany @model @auth(rules: [{ allow: public, operations: [read] }, { allow: owner }]) {
  id: ID! @primaryKey
  primaryId: ID!
  primary: Primary @belongsTo(references: "primaryId")
}

type RelatedOne @model @auth(rules: [{ allow: public, operations: [read] }, { allow: owner }]) {
  id: ID! @primaryKey
  primaryId: ID!
  primary: Primary @belongsTo(references: "primaryId")
}
```

the MIS (abridged to show relationship information only) looks like:

```json
{
  "version": 1,
  "models": {
    "Primary": {
      "name": "Primary",
      "fields": {
        "relatedMany": {
          "name": "relatedMany",
          "isArray": true,
          "type": {
            "model": "RelatedMany"
          },
          "isRequired": false,
          "attributes": [],
          "isArrayNullable": true,
          "association": {
            "connectionType": "HAS_MANY",
            "associatedWith": ["primaryId"]
          }
        },
        "relatedOne": {
          "name": "relatedOne",
          "isArray": false,
          "type": {
            "model": "RelatedOne"
          },
          "isRequired": false,
          "attributes": [],
          "association": {
            "connectionType": "HAS_ONE",
            "associatedWith": ["primaryId"],
          }
        }
      }
    },
    "RelatedMany": {
      "name": "RelatedMany",
      "fields": {
        "primary": {
          "name": "primary",
          "isArray": false,
          "type": {
            "model": "Primary"
          },
          "isRequired": false,
          "attributes": [],
          "association": {
            "connectionType": "BELONGS_TO",
            "targetNames": ["primaryId"]
          }
        },
        "primaryId": {
          "name": "primaryId",
          "isArray": false,
          "type": "ID",
          "isRequired": false,
          "attributes": []
        }
      }
    },
    "RelatedOne": {
      "name": "RelatedOne",
      "fields": {
        "primary": {
          "name": "primary",
          "isArray": false,
          "type": {
            "model": "Primary"
          },
          "isRequired": false,
          "attributes": [],
          "association": {
            "connectionType": "BELONGS_TO",
            "targetNames": ["primaryId"]
          }
        },
        "primaryId": {
          "name": "primaryId",
          "isArray": false,
          "type": "ID",
          "isRequired": false,
          "attributes": []
        }
      }
    }
  }
}
```

## Glossary

* **Associated type** - In a field decorated with a `@hasMany`, `@hasOne`, or `@belongsTo` directive, the model “pointed to” by the directive. In the sample schema:
    * `Related` is the **associated type** for the `@hasMany` directive on `Primary.related`
    * `Primary` is the **associated type** for the `@belongsTo` directive on `Related.primary` 
* **Association field** - See **Connection field**
* **Connection field** - In any model type, the field that is decorated with a `@hasMany`, `@hasOne`, or `@belongsTo` directive. In the sample schema:
    * `Primary.related` is the **connection field** in the `Primary` model, for the relationship `Primary -> Related` defined by the `@hasMany` on `Primary.related` and the `@belongsTo` on `Related.primary`
    * `Related.primary` is the **connection field** in the `Related` model, for the relationship `Primary -> Related` defined by the `@hasMany` on `Primary.related` and the `@belongsTo` on `Related.primary`
* **Source type** - In a field decorated with a `@hasMany`, `@hasOne`, or `@belongsTo` directive, the model containing the directive. In the sample schema:
    * `Primary` is the **source type** for the `@hasMany` directive on `Primary.related` 
    * `Related` is the **source type** for the `@belongsTo` directive on `Related.primary`

## Structure

Relationships are modeled in an `association` structure in the MIS. The `association` attribute must belong to a `@model` field, not a field of non-model type, enum, input, or custom query/mutation.

Here are the relevant types to define the association structure. Note that this is a simplified rendition of the JSON/JavaScript version of the MIS. Other platforms may represent the MIS differently. The full definition is in [source code](./appsync-modelgen-plugin/src/utils/process-connections.ts);

```ts
enum CodeGenConnectionType {
  HAS_ONE = 'HAS_ONE',
  BELONGS_TO = 'BELONGS_TO',
  HAS_MANY = 'HAS_MANY',
}

type CodeGenConnectionTypeBase = {
  kind: CodeGenConnectionType;
  connectedModel: CodeGenModel;
    // ^-- Type not shown
};

type CodeGenFieldConnectionBelongsTo = CodeGenConnectionTypeBase & {
  kind: CodeGenConnectionType.BELONGS_TO;
  targetNames: string[];
}

type CodeGenFieldConnectionHasOne = CodeGenConnectionTypeBase & {
  kind: CodeGenConnectionType.HAS_ONE;
  associatedWith: CodeGenField[];
    // ^-- Type not shown -- rendered in MIS as a string array
  targetNames: string[];
}

export type CodeGenFieldConnectionHasMany = CodeGenConnectionTypeBase & {
  kind: CodeGenConnectionType.HAS_MANY;
  associatedWith: CodeGenField[];
    // ^-- Type not shown -- rendered in MIS as a string array
}
```

Considering a snippet of the above sample:

```json
  "models": {
    "Primary": {
      "name": "Primary",
      "fields": {
        "relatedMany": {
          "name": "relatedMany",
          "isArray": true,
          "type": {
            "model": "RelatedMany"
          },
          "isRequired": false,
          "attributes": [],
          "isArrayNullable": true,
          "association": {
            "connectionType": "HAS_MANY",
            "associatedWith": ["primaryId"]
          }
        },
...
    "RelatedMany": {
      "name": "RelatedMany",
      "fields": {
        "primary": {
          "name": "primary",
          "isArray": false,
          "type": {
            "model": "Primary"
          },
          "isRequired": false,
          "attributes": [],
          "association": {
            "connectionType": "BELONGS_TO",
            "targetNames": ["primaryId"]
          }
        },
        "primaryId": {
          "name": "primaryId",
          "isArray": false,
          "type": "ID",
          "isRequired": false,
          "attributes": []
        }
```

- `models.Primary` - A type definition. The **source type** for any `association`s defined in this model.
- `models.Primary.fields.relatedMany` - The **association field**/**connection field**
- `models.Primary.fields.relatedMany.type` - The **associated type** for this relationship. This must be a `@model`.
- `models.Primary.fields.relatedMany.association` - The structure containing the data needed to navigate the relationship with the associated type
- `models.Primary.fields.relatedMany.association.connectionType` - The kind of relationship (has one, has many, belongs to) this **source type** has with the associated type
- `models.Primary.fields.relatedMany.association.associatedWith` - A list of fields on the **associated type** that hold the primary key of the **source** record. This is an array so we can support composite primary keys.
- `models.RelatedMany` - A type definition. The **source type** for any `association`s defined in this model.
- `models.RelatedMany.fields.primary.association.targetNames` - A list of fields on the **source type** (that is, the current type) that hold the primary key of the **associated** record. This is an array so we can support composite primary keys.
- `models.RelatedMany.fields.primaryId` - The field pointed to by `targetNames` above, containing the primary key of the **associated** record for the `RelatedOne.primary` relationship.


## Navigating relationships

We will describe the steps to resolve the record in pseudo-sql

### From source record to associated record

* If the source model has an `associatedWith` but no `targetNames`:
    ```
    SELECT *
    FROM <associated type>
    WHERE <associatedWith fields> = <source type>.primaryKey
    ```
* If the source model has an `associatedWith` AND `targetNames`:
    ```
    SELECT *
    FROM <associated type>
    WHERE <associatedWith fields> = <source type>.<targetNames fields>
    ```
* If the source model has a `targetNames` but no `associatedWith`:
    ```
    SELECT *
    FROM <associated type>
    WHERE <source type>.<targetNames fields> = <associated type>.primaryKey
    ```



