import { IPropertyValue } from "../types";
import { PropertyValue, PropertyValueProps } from "./PropertyValue";

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
