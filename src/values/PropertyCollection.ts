import { merge } from "lodash";
import { Value, IPropertyValue } from "../types";
import { objectToValues, getType } from "../utils";
import { PropertyValue, PropertyValueProps } from "./PropertyValue";
import { queryData } from "../query";
import { IniRules } from "../rules";

export class PropertyCollection extends PropertyValue {
  private orphaned = false;
  public value: Value[] = [];
  constructor(
    props: PropertyValueProps & {
      orphaned?: boolean;
    }
  ) {
    super(props);
    this.type = "collection";
    this.value = props.value;
    this.modifier = null;
    this.orphaned = props.orphaned ?? this.orphaned;
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
    let result = this.orphaned ? "" : `[${this.slug}]\n`;
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
      if (property?.type === "collection") {
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

  /**
   * Sorts the properties in the collection alphabetically.
   * This function will leave and comments or newlines in place.
   * // directions are `ascending`, `descending`, and `none`
   */
  sort = (direction: IniRules["propertySorting"]) => {
    if (direction === "none") return this;
    // availalble indexes are all the indexes that are not comments or newlines
    const availableIndexes = this.value
      .map((item, index) => {
        if (item.type === "comment" || item.type === "newline") return null;
        return index;
      })
      .filter((item) => item !== null) as number[];

    const sortableValues = this.value.filter(
      (item) => item.type !== "comment" && item.type !== "newline"
    ) as PropertyValue[];

    // sort the values
    sortableValues.sort((a, b) => {
      if (direction === "ascending") {
        return a.slug.localeCompare(b.slug);
      } else {
        return b.slug.localeCompare(a.slug);
      }
    });

    // reinsert the values into the collection
    const newValues: PropertyValue[] = [];
    for (const index of availableIndexes) {
      const value = sortableValues.shift();
      if (value) {
        newValues[index] = value;
      }
    }

    this.value = newValues;
  };
}
