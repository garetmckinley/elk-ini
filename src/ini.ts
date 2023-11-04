import { v4 } from "uuid";
import { Config, IPropertyValue, Value } from "./types";
import { merge } from "lodash";
import { queryData } from "./query";
import { convertToTypedValue } from "./utils";
import { NoopValue } from "./values/NoopValue";
import { PropertyCollection } from "./values/PropertyCollection";
import { PropertyValue } from "./values/PropertyValue";
import { IniRules, DEFAULT_RULES } from "./rules";

export interface IniProps {
  rules: Partial<IniRules>;
}

export class Ini<T> {
  value: Config = [];
  rules: IniRules = {
    ...DEFAULT_RULES,
  };

  get data(): Config {
    return this.value;
  }

  constructor(input: string | Ini<T>, props: IniProps = { rules: {} }) {
    this.rules = {
      ...DEFAULT_RULES,
      ...props.rules,
    };
    if (typeof input === "string") {
      this.value = this.parse(input);
    } else {
      this.value = input.value;
    }
  }

  /**
   * Query the ini configuration for a given keyPath.
   */
  query = (keyPath: string): Value[] => {
    return queryData(this.value, keyPath);
  };

  /**
   * Render the ini file into a static, serializable object.
   */
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

  /**
   * Parse an ini string into a a queryable object.
   */
  parse = (data: string): Config => {
    const config: Config = [];
    let currentGroup: PropertyCollection | null = null;
    const lines = data.split(/\r?\n/);

    const { allowOrphanedProperties, maxDepth } = this.rules;

    for (const line of lines) {
      // Skip empty lines or comments
      if (line.trim() === "" || line.trim().startsWith(";")) {
        if (line.trim() === "" && !this.rules.preserveNewlines) {
          continue;
        }

        if (line.trim().startsWith(";") && !this.rules.preserveComments) {
          continue;
        }

        const noop = new NoopValue({
          slug: v4(),
          value: line,
          parent: currentGroup ?? (this as any),
          ini: this,
        });

        if (currentGroup) {
          currentGroup.value.push(noop);
        } else {
          config.push(
            new PropertyCollection({
              slug: "",
              value: [noop],
              orphaned: true,
              ini: this,
            })
          );
        }
        continue;
      }

      // Check for group
      if (line.startsWith("[")) {
        const slug = line.slice(1, -1);

        if (slug.split(".").length > maxDepth) {
          throw new Error(`Max depth of ${maxDepth} exceeded: ${slug}`);
        }

        currentGroup = new PropertyCollection({
          slug,
          value: [],
          parent: this as any,
          ini: this,
        });
        config.push(currentGroup);
        continue;
      }

      // Parse key, modifier and value
      let [rawKey, rawValue] = line.split("=");
      let key = rawKey.trim();
      let value = rawValue.trim();
      let modifier: "<" | "|" | ">" | null = null;
      if (["<", "|", ">"].includes(value[0])) {
        modifier = value[0] as "<" | "|" | ">";
        value = value.slice(1);
      }

      const propertyValue = new PropertyValue({
        slug: key.trim(),
        value: convertToTypedValue(value),
        modifier,
        parent: currentGroup ?? (this as any),
        ini: this,
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
              ini: this,
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
      } else {
        if (allowOrphanedProperties) {
          config.push(
            new PropertyCollection({
              slug: key,
              value: [propertyValue],
              parent: this as any,
              ini: this,
            })
          );
        } else {
          throw new Error(`Orphaned property found: ${key}=${value}`);
        }
      }
    }

    config.forEach((item) => item.sort(this.rules.propertySorting));

    return config;
  };

  /**
   * Returns a valid ini string representation of the ini file.
   */
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
  get = (keyPath: string): Value => this.expectOne(keyPath);

  /**
   * Set a single value at a given keyPath.
   */
  set = (keyPath: string, value: any) => {
    const match = this.expectOne(keyPath);
    match.set(keyPath, value);
    return this;
  };

  /**
   * Drop a single value at a given keyPath.
   */
  drop = (keyPath: string) => {
    const match = this.expectOne(keyPath);
    return match.drop();
  };

  /**
   * Merge multiple inis instances into one.
   */
  merge = (...inis: Ini<T>[]) => {
    const merged = [this, ...inis].map((ini) => ini.stringify()).join("\n");

    this.value = this.parse(merged);

    return this;
  };

  /**
   * Assert that a value at a given keyPath is equal to a given value.
   */
  assert = (keyPath: string, value: any) => {
    try {
      const match = this.expectOne(keyPath);
      return match.value === value;
    } catch (error) {
      if (value === "" || value === 0) {
        return false;
      }
      return !Boolean(value);
    }
  };
}
