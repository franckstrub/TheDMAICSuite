
declare module 'jstat' {
  interface StudentT {
    cdf(x: number, df: number): number;
  }

  interface JStatStatic {
    studentt: StudentT;
  }

  const jstat: JStatStatic;
  export = jstat;
}
