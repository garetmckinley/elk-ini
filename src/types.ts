import { NoopValue } from "./values/NoopValue";
import { PropertyCollection } from "./values/PropertyCollection";
import { PropertyValue } from "./values/PropertyValue";

export interface IPropertyValue {
  type:
    | "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "undefined"
    | "object"
    | "function"
    | "array"
    | "comment"
    | "newline"
    | "property";
  value:
    | string
    | number
    | bigint
    | boolean
    | symbol
    | undefined
    | object
    | Array<PropertyValue>
    | PropertyValue;
  modifier: "<" | "|" | ">" | null;
  slug: string;
}

export type Value = PropertyValue | NoopValue | PropertyCollection;

export interface IPropertyCollection {
  type: "property";
  value: Value[];
  modifier: null;
}

export type Config = PropertyCollection[];

// export interface Config {
//   [group: string]: {
//     [property: string]:
//       | Value
//       | {
//           [key: string]: Value;
//         };
//   };
// }

export interface StaticConfig {
  [group: string]:
    | IPropertyValue["value"]
    | {
        [property: string]: IPropertyValue["value"];
      };
}
