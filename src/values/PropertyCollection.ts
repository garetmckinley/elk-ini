import { merge } from "lodash";
import { Value, IPropertyValue } from "../types";
import { objectToValues, getType } from "../utils";
import { PropertyValue, PropertyValueProps } from "./PropertyValue";
import { queryData } from "../query";

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
