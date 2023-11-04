import { PropertyValue } from "./PropertyValue";

describe("constructor", () => {
  it("sets the type to string by default", () => {
    expect(new PropertyValue({ slug: "test", value: "test" }).type).toEqual(
      "string"
    );
  });

  it("sets the type to array when the value is an array", () => {
    expect(
      new PropertyValue({ slug: "test", value: ["test", "test2"] }).type
    ).toEqual("array");
  });

  it("sets the type to boolean when the value is a boolean", () => {
    expect(new PropertyValue({ slug: "test", value: true }).type).toEqual(
      "boolean"
    );
  });

  it("sets the type to number when the value is a number", () => {
    expect(new PropertyValue({ slug: "test", value: 1 }).type).toEqual(
      "number"
    );
  });

  it("sets the slug", () => {
    expect(new PropertyValue({ slug: "test", value: "test" }).slug).toEqual(
      "test"
    );
  });

  it("sets the value", () => {
    expect(new PropertyValue({ slug: "test", value: "test" }).value).toEqual(
      "test"
    );
  });

  it("sets the modifier", () => {
    expect(
      new PropertyValue({ slug: "test", value: "test", modifier: "<" }).modifier
    ).toEqual("<");
  });
});

describe("render", () => {
  describe("when the type is array", () => {
    it("renders the array", () => {
      expect(
        new PropertyValue({
          slug: "test",
          value: [
            new PropertyValue({ slug: "test", value: "test" }),
            new PropertyValue({ slug: "test2", value: "test2" }),
          ],
        }).render()
      ).toEqual(["test", "test2"]);
    });
  });

  describe("when the type is not array", () => {
    it("renders the value", () => {
      expect(
        new PropertyValue({ slug: "test", value: "test" }).render()
      ).toEqual("test");
    });
  });
});

describe("stringify", () => {
  describe("when the type is array", () => {
    it("renders the array", () => {
      expect(
        new PropertyValue({
          slug: "test",
          value: [
            new PropertyValue({ slug: "test", value: "test" }),
            new PropertyValue({ slug: "test2", value: "test2" }),
          ],
        }).stringify()
      ).toEqual(`test=test
test2=test2
`);
    });
  });
});
