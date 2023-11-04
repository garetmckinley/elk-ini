export interface IniRules {
  /**
   * Allow properties without a group.
   * @default false
   */
  allowOrphanedProperties: boolean;
  /**
   * Maximum depth of nested groups.
   * @default 10
   */
  maxDepth: number;
  /**
   * Preserve comments.
   * @default true
   */
  preserveComments: boolean;
  /**
   * Preserve newlines.
   * @default true
   */
  preserveNewlines: boolean;
  /**
   * Should duplicate groups merge or overwrite.
   * @default "merge"
   */
  duplicateGroups: "merge" | "overwrite";
  /**
   * Should add spaces around the equal sign.
   * @default true
   */
  useAssignmentSpacing: boolean;
  /**
   * Property sorting order
   * @default "none"
   */
  propertySorting: "none" | "ascending" | "descending";
}

export const DEFAULT_RULES: IniRules = {
  allowOrphanedProperties: false,
  maxDepth: 10,
  preserveComments: true,
  preserveNewlines: true,
  duplicateGroups: "merge",
  useAssignmentSpacing: true,
  propertySorting: "none",
};
