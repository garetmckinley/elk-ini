import { Value } from "./types";
import { PropertyCollection } from "./values/PropertyCollection";

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
export const queryData = (data: Value[], keyPath: string): Value[] => {
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
