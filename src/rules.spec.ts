import { Ini } from "./ini";

describe("Ini Compiler Rules", () => {
  describe("allowOrphanedProperties", () => {
    describe("when false", () => {
      it("throws an error when orphaned property is found", () => {
        expect(
          () =>
            new Ini(`orphaned=property`, {
              rules: {
                allowOrphanedProperties: false,
              },
            })
        ).toThrow(new Error("Orphaned property found: orphaned=property"));
      });
    });

    describe("when true", () => {
      it("does not throw an error when orphaned property is found", () => {
        expect(
          () =>
            new Ini(`orphaned=property`, {
              rules: {
                allowOrphanedProperties: true,
              },
            })
        ).not.toThrow();
      });
    });
  });

  describe("maxDepth", () => {
    describe("when maxDepth is exceeded", () => {
      it("throws an error with the exceeded group", () => {
        expect(
          () =>
            new Ini(
              `[group.subgroup.subsubgroup.subsubsubgroup.subsubsubsubgroup]`,
              {
                rules: {
                  maxDepth: 4,
                },
              }
            )
        ).toThrow(
          new Error(
            "Max depth of 4 exceeded: group.subgroup.subsubgroup.subsubsubgroup.subsubsubsubgroup"
          )
        );
      });
    });

    describe("when maxDepth is not exceeded", () => {
      it("does not throw an error", () => {
        expect(
          () =>
            new Ini(
              `[group.subgroup.subsubgroup.subsubsubgroup.subsubsubsubgroup]`,
              {
                rules: {
                  maxDepth: 5,
                },
              }
            )
        ).not.toThrow();
      });
    });
  });

  describe("preserveComments", () => {
    describe("when preserveComments is true", () => {
      it("preserves comments in the output", () => {
        expect(
          new Ini(`; comment`, {
            rules: { preserveComments: true },
          }).stringify()
        ).toEqual("; comment\n");
      });
    });

    describe("when preserveComments is false", () => {
      it("does not preserve comments in the output", () => {
        expect(
          new Ini(`; comment`, {
            rules: { preserveComments: false },
          }).stringify()
        ).toEqual("");
      });
    });
  });

  describe("preserveNewlines", () => {
    describe("when preserveNewlines is true", () => {
      it("preserves newlines in the output", () => {
        expect(
          new Ini(`\n`, { rules: { preserveNewlines: true } }).stringify()
        ).toEqual("\n\n");
      });
    });

    describe("when preserveNewlines is false", () => {
      it("does not preserve newlines in the output", () => {
        expect(
          new Ini(`\n`, { rules: { preserveNewlines: false } }).stringify()
        ).toEqual("");
      });
    });
  });

  describe("useAssignmentSpacing", () => {
    describe("when useAssignmentSpacing is true", () => {
      it("uses spaces around the assignment operator in the output", () => {
        expect(
          new Ini("[hub]\ntest=some stuff", {
            rules: { useAssignmentSpacing: true },
          }).stringify()
        ).toEqual("[hub]\ntest = some stuff\n");
      });
    });

    describe("when useAssignmentSpacing is false", () => {
      it("does not use spaces around the assignment operator in the output", () => {
        expect(
          new Ini("[hub]\ntest = some stuff\n", {
            rules: { useAssignmentSpacing: false },
          }).stringify()
        ).toEqual("[hub]\ntest=some stuff\n");
      });
    });
  });

  describe("propertySorting", () => {
    describe("when propertySorting is none", () => {
      it("does not sort the properties in the output", () => {
        expect(
          new Ini(
            `[group]
z = 1
a = 2`,
            {
              rules: { propertySorting: "none" },
            }
          ).stringify()
        ).toEqual(`[group]
z = 1
a = 2
`);
      });
    });

    describe("when propertySorting is ascending", () => {
      it("sorts the properties in ascending order in the output", () => {
        expect(
          new Ini(
            `[group]
z = 1

a = 2`,
            {
              rules: { propertySorting: "ascending" },
            }
          ).stringify()
        ).toEqual(`[group]
a = 2
z = 1
`);
      });
    });

    describe("when propertySorting is descending", () => {
      it("sorts the properties in descending order in the output", () => {
        expect(
          new Ini(
            `[group]
z = 1
a = 2`,
            {
              rules: { propertySorting: "descending" },
            }
          ).stringify()
        ).toEqual(`[group]
z = 1
a = 2
`);
      });
    });
  });
});
