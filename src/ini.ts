import { v4 } from "uuid";
import { Config, IPropertyValue, Value } from "./types";
import { merge } from "lodash";
import { queryData } from "./query";
import { convertToTypedValue } from "./utils";
import { NoopValue } from "./values/NoopValue";
import { PropertyCollection } from "./values/PropertyCollection";
import { PropertyValue } from "./values/PropertyValue";

export class Ini<T> {
  value: Config = [];

  get data(): Config {
    return this.value;
  }

  constructor(input: string | Ini<T>) {
    if (typeof input === "string") {
      this.value = this.parse(input);
    } else {
      this.value = input.value;
    }
  }

  query = (keyPath: string): Value[] => {
    return queryData(this.value, keyPath);
  };

  // should recursively iterate over the entire config and call render on each value
  render = (): T => {
    const entities = this.value.map((item: PropertyCollection) => {
      let entity: any = {};
      const path = item.slug.split(".");

      if (path.length === 1) {
        return { [item.slug]: item.render() };
      }

      const [first, ...rest] = path;

      entity[first] = rest.reduce((acc: any, key) => {
        acc[key] = item.render();
        return acc;
      }, {});

      return entity;
    });
    return merge({}, ...entities);
  };

  parse = (data: string): Config => {
    const config: Config = [];
    let currentGroup: PropertyCollection | null = null;
    const lines = data.split(/\r?\n/);

    for (const line of lines) {
      // Skip empty lines or comments
      if (line.trim() === "" || line.trim().startsWith(";")) {
        const noop = new NoopValue({
          slug: v4(),
          value: line,
          parent: currentGroup ?? (this as any),
        });

        if (currentGroup) {
          currentGroup.value.push(noop);
        }
        continue;
      }

      // Check for group
      if (line.startsWith("[")) {
        currentGroup = new PropertyCollection({
          slug: line.slice(1, -1),
          value: [],
          parent: this as any,
        });
        config.push(currentGroup);
        continue;
      }

      // Parse key, modifier and value
      let [key, value] = line.split("=");
      let modifier: "<" | "|" | ">" | null = null;
      if (["<", "|", ">"].includes(value[0])) {
        modifier = value[0] as "<" | "|" | ">";
        value = value.slice(1);
      }

      const propertyValue = new PropertyValue({
        slug: key,
        value: convertToTypedValue(value),
        modifier,
        parent: currentGroup ?? (this as any),
      });

      // Check for array properties
      if (key.endsWith("[]")) {
        key = key.slice(0, -2);
        if (!currentGroup?.value.find((item) => item.slug === key)) {
          currentGroup?.value.push(
            new PropertyValue({
              slug: key,
              value: [propertyValue],
              modifier,
              parent: currentGroup ?? (this as any),
            })
          );
        } else {
          const property = currentGroup?.value.find(
            (item) => item.slug === key
          );
          if (property?.type === "array") {
            (property.value as Array<IPropertyValue>).push(propertyValue);
          }
        }

        continue;
      } else if (currentGroup) {
        // config[currentGroup][key] = propertyValue;
        currentGroup.value.push(propertyValue);
      }
    }

    return config;
  };

  stringify = (): string => {
    let result = "";

    for (const group of this.value) {
      result += group.stringify();
    }

    return result;
  };

  /**
   * Returns a single value at a given keyPath.
   * Throws an error if no exact match is found.
   */
  expectOne = (keyPath: string): Value => {
    const matches = this.query(keyPath);
    if (matches.length === 0) throw new Error("No exact matches found");
    return matches[0];
  };

  /**
   * Returns many values at a given keyPath.
   */
  expectMany = (keyPath: string): Value[] => {
    const matches = this.query(keyPath) || [];
    return matches;
  };

  /**
   * Returns N values at a given keyPath.
   * Throws an error if the number of matches is not equal to N.
   */
  expectN = (keyPath: string, n: number): Value[] => {
    const matches = this.query(keyPath);
    if (matches.length !== n)
      throw new Error(`Expected ${n} matches, found ${matches.length}`);
    return matches;
  };

  find = (keyPath: string): Value | undefined =>
    this.value.find((item) => item.slug === keyPath);

  /**
   * Get a single value at a given keyPath.
   */
  get = (keyPath: string): Value | undefined => this.expectOne(keyPath);

  /**
   * Set a single value at a given keyPath.
   */
  set = (keyPath: string, value: any) => {
    const match = this.expectOne(keyPath);
    match.set(keyPath, value);
    return this;
  };

  merge = (...inis: Ini<T>[]) => {
    const merged = [this, ...inis].map((ini) => ini.stringify()).join("\n");

    this.value = this.parse(merged);

    return this;
  };
}
