import { v4 } from "uuid";
import { Config, IPropertyValue, StaticConfig, Value } from "./types";
import { merge } from "lodash";

function determineType(value: string): "string" | "number" | "boolean" {
  if (value === "true" || value === "false") return "boolean";
  if (!isNaN(Number(value))) return "number";
  return "string";
}

const getType = (value: any): IPropertyValue["type"] => {
  if (Array.isArray(value)) return "array";
  return typeof value as IPropertyValue["type"];
};

function convertToTypedValue(value: string): any {
  const type = determineType(value);
  switch (type) {
    case "boolean":
      return value === "true";
    case "number":
      return Number(value);
    default:
      return value;
  }
}

type useValidRouteOverload = {
  (value?: string): boolean;
  (value?: string[]): boolean;
};

interface PropertyValueProps {
  slug: string;
  value: any;
  modifier?: IPropertyValue["modifier"];
  parent?: PropertyCollection | null;
}

export class PropertyValue {
  public parent: PropertyCollection | null = null;
  public type: IPropertyValue["type"] = "undefined";
  public value: IPropertyValue["value"] = undefined;
  public modifier: IPropertyValue["modifier"] = null;
  public slug: IPropertyValue["slug"] = "";

  constructor({ slug, value, modifier, parent }: PropertyValueProps) {
    this.type = getType(value);
    this.value = value;
    this.slug = slug;
    this.modifier = modifier ?? null;
    this.parent = parent ?? null;
  }

  render = (): IPropertyValue["value"] => {
    switch (this.type) {
      case "array":
        return (this.value as Array<PropertyValue>).map((item) =>
          item.render()
        );
      default:
        return this.value;
    }
  };

  stringify = (): string => {
    switch (this.type) {
      case "array":
        return (this.value as Array<PropertyValue>)
          .map((item) => item.stringify())
          .join("");
      default:
        return `${this.slug}=${this.modifier ?? ""}${String(this.value)}\n`;
    }
  };

  set = (slug: string, value: any, typeOverride?: IPropertyValue["type"]) => {
    const type = typeOverride ?? getType(value);
    if (type === "array" && Array.isArray(value)) {
      value = value.map((v) => ({
        type: getType(v),
        value: v,
        modifier: null,
        slug,
      }));
    }

    this.value = {
      type: type,
      value: value,
      modifier: null,
      slug,
    };

    return this;
  };

  drop = () => {
    if (!this.parent) return;
    const index = this.parent.value.indexOf(this);
    this.parent.value.splice(index, 1);
  };
}

export class NoopValue extends PropertyValue {
  constructor(props: PropertyValueProps) {
    super(props);
    this.type = props.value.startsWith(";") ? "comment" : "newline";
    this.value = this.type === "comment" ? `${props.value}\n` : "\n";
  }

  render = (): IPropertyValue["value"] => this.value;

  stringify = (): string => String(this.value);

  set = (slug: string, value: any) => {
    this.value = value;
    return this;
  };
}

export const objectToValues = (obj: any) => {
  const keys = Object.keys(obj);
  const values = Object.values(obj);

  const value = values.map((item, index) => {
    const type = getType(item);
    const slug = keys[index];
    return new PropertyValue({ slug, value: item, modifier: null });
  });

  return value;
};

export class PropertyCollection extends PropertyValue {
  public value: Value[] = [];
  constructor(props: PropertyValueProps) {
    super(props);
    this.type = "property";
    this.value = props.value;
    this.modifier = null;
  }

  /**
   * Should return a static object that represents the current state of the config.
   * This happens by calling the render method on each property in the collection.
   * The return should contain an object with all the properties in the collection.
   */
  render = (): IPropertyValue["value"] => {
    const entities = this.value.map((item) => ({ [item.slug]: item.render() }));
    return merge({}, ...entities);
  };

  stringify = (): string => {
    let result = `[${this.slug}]\n`;
    result += this.value.map((item) => item.stringify()).join("");
    return result.trim() + "\n";
  };

  set = (slug: string, value: any) => {
    if (slug === this.slug) {
      this.value = objectToValues(value).map((item) => {
        item.parent = this;
        return item;
      });
      return this;
    }

    const type = getType(value);
    const exists = !!this.value.find((item) => item.slug === slug);

    if (exists) {
      const property = this.value.find((item) => item.slug === slug);
      if (property?.type === "property") {
        property.set(slug, value, type);
      }
    } else {
      this.value.push(
        new PropertyValue({ slug, value, modifier: null, parent: this })
      );
    }

    return this;
  };

  query = (keyPath: string): Value[] => {
    return queryData(this.value, keyPath);
  };
}

/**
 * query allows you to fetch deeply nested values from the ini data.
 *
 * For example, if you have a config like this:
 *
 * ```ini
 * [use.remote]
 * nocache=true
 * urls[]=https://pastebin.com/raw/Na2Hmfm8
 * urls[]=https://hue.elk.wtf/palettes/cyberpunk
 * ```
 *
 * You can query for the value of `nocache` like this:
 *
 * ```ts
 * const ini = new Ini(sampleIni);
 * const nocache = ini.query("use.remote.nocache");
 * ```
 *
 * This will return a PropertyValue object that you can use to get the value:
 *
 * ```ts
 * const nocache = ini.query("use.remote.nocache");
 * console.log(nocache.value); // true
 * ```
 *
 * This works by comparing the keyPath to the slug of each property in the config.
 *
 * Note: If there are multiple matches for the keyPath, we should concatenate the values
 * into an array, if they all contain `array` types.
 *
 * Note: collection values can sometimes have a slug that has multiple parts, like `use.remote`.
 *
 * @param keyPath a dot separated path to the value you want to query
 */
const queryData = (data: Value[], keyPath: string): Value[] => {
  const matches: Value[] = [];

  const keys = keyPath.split(".");

  // every combination of keys
  const keyCombinations = keys.map((_, index) =>
    keys
      .slice(0, index + 1)
      .map((key) => key)
      .join(".")
  );

  // iterate over each key combination backwards, so we can find the most specific match first
  for (let i = keyCombinations.length - 1; i >= 0; i--) {
    const key = keyCombinations[i];
    const exactMatches = data.filter((item) => item.slug === key);
    const partialMatches = data.filter((item) =>
      item.slug.startsWith(key + ".")
    );
    const isMostSpecificKeyPath = i === keyCombinations.length - 1;

    for (const match of exactMatches) {
      if (isMostSpecificKeyPath) {
        matches.push(match);
      }

      if (match.type === "property") {
        const remaining = keyPath.slice(key.length + 1);
        if (!remaining) continue;
        const remainingMatches = (match as PropertyCollection).query(remaining);
        matches.push(...remainingMatches);
      }
    }

    for (const match of partialMatches) {
      if (isMostSpecificKeyPath) {
        matches.push(match);
      }

      if (match.type === "property") {
        const remaining = keyPath.slice(key.length + 1);
        if (!remaining) continue;
        const remainingMatches = (match as PropertyCollection).query(remaining);
        matches.push(...remainingMatches);
      }
    }
  }

  return matches;
};

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
    const entities = this.value.map((item) => {
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

  expectOne = (keyPath: string): Value => {
    const matches = this.query(keyPath);
    if (matches.length === 0) throw new Error("No exact matches found");
    return matches[0];
  };

  expectMany = (keyPath: string): Value[] => {
    const matches = this.query(keyPath);
    if (matches.length === 0) throw new Error("No exact matches found");
    return matches;
  };

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
