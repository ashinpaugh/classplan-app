
export class ArrayUtil {

  /**
   * Takes a set of data and filters out duplicates.
   */
  static unique<T>(arr: T[], prop: keyof T): T[] {
    // return arr.filter((v, i, a) => a.indexOf(v) === i);

    // @see https://dev.to/misterwhat/comment/a65g
    const reduction: Map<string|number, T> = arr
      .reduce((acc, item) => item && item[prop] && acc.set(item[prop], item), new Map())
    ;

    return Array.from(reduction.values());
  }
}
