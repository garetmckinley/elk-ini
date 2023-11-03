import { IPropertyValue } from "../types";
import { PropertyValue } from "../values/PropertyValue";

export function determineType(value: string): "string" | "number" | "boolean" {
  if (value === "true" || value === "false") return "boolean";
  if (!isNaN(Number(value))) return "number";
  return "string";
}

export const getType = (value: any): IPropertyValue["type"] => {
  if (Array.isArray(value)) return "array";
  return typeof value as IPropertyValue["type"];
};

export function convertToTypedValue(value: string): any {
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
