declare module 'jstat' {
  export interface jStat {
    normal: {
      pdf(x: number, mean: number, std: number): number;
      cdf(x: number, mean: number, std: number): number;
      inv(p: number, mean: number, std: number): number;
    };
    studentt: {
      pdf(x: number, dof: number): number;
      cdf(x: number, dof: number): number;
      inv(p: number, dof: number): number;
    };
    chisquare: {
      pdf(x: number, dof: number): number;
      cdf(x: number, dof: number): number;
      inv(p: number, dof: number): number;
    };
    centralF: {
      pdf(x: number, df1: number, df2: number): number;
      cdf(x: number, df1: number, df2: number): number;
      inv(p: number, df1: number, df2: number): number;
    };
    mean(data: number[]): number;
    median(data: number[]): number;
    mode(data: number[]): number;
    variance(data: number[]): number;
    stdev(data: number[]): number;
    sum(data: number[]): number;
    min(data: number[]): number;
    max(data: number[]): number;
    range(data: number[]): number;
    quartiles(data: number[]): number[];
    percentile(data: number[], p: number): number;
  }

  const jStat: jStat;
  export = jStat;
}