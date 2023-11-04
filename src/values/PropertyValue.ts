import { Ini } from "../ini";
import { IPropertyValue } from "../types";
import { getType } from "../utils";
import { PropertyCollection } from "./PropertyCollection";

export interface PropertyValueProps {
  slug: string;
  value: any;
  modifier?: IPropertyValue["modifier"];
  parent?: PropertyCollection | null;
  ini?: Ini<any>;
}

export class PropertyValue {
  public parent: PropertyCollection | null = null;
  public type: IPropertyValue["type"] = "undefined";
  public value: IPropertyValue["value"] = undefined;
  public modifier: IPropertyValue["modifier"] = null;
  public slug: IPropertyValue["slug"] = "";
  private ini?: Ini<any>;

  constructor({ slug, value, modifier, parent, ini }: PropertyValueProps) {
    this.type = getType(value);
    this.value = value;
    this.slug = slug;
    this.modifier = modifier ?? null;
    this.parent = parent ?? null;
    this.ini = ini;
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
        const operator = this.ini?.rules.useAssignmentSpacing ? " = " : "=";
        // return `${this.slug}${operator}${this.modifier ?? ""}${String(this.value)}\n`;
        return [
          this.slug,
          operator,
          this.modifier ?? "",
          String(this.value),
          "\n",
        ].join("");
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

    this.value = value;
    this.type = type;

    return this;
  };

  drop = () => {
    if (!this.parent) return;
    const index = this.parent.value.indexOf(this);
    this.parent.value.splice(index, 1);
  };

  assert = (value: any): boolean => {
    return this.value === value;
  };
}
