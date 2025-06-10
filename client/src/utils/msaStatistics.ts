/**
 * MSA Attribute Agreement Analysis Statistics
 * 
 * This module provides comprehensive statistical calculations for Measurement System Analysis
 * including Cohen's Kappa, Fleiss' Kappa, percent agreement, and other reliability metrics.
 */

import { Matrix } from 'ml-matrix';
import * as stats from 'simple-statistics';

export interface AttributeAnalysisRow {
  unitNumber: number;
  reference: "OK" | "KO" | "";
  app1_rep1: "OK" | "KO" | "";
  app1_rep2: "OK" | "KO" | "";
  app1_rep3: "OK" | "KO" | "";
  app2_rep1: "OK" | "KO" | "";
  app2_rep2: "OK" | "KO" | "";
  app2_rep3: "OK" | "KO" | "";
  app3_rep1: "OK" | "KO" | "";
  app3_rep2: "OK" | "KO" | "";
  app3_rep3: "OK" | "KO" | "";
}

export interface MSAStatistics {
  overallAgreement: {
    percentAgreement: number;
    cohensKappa?: number;
    fleissKappa?: number;
  };
  appraiserVsStandard: {
    app1Agreement: number;
    app2Agreement: number;
    app3Agreement: number;
    app1Kappa?: number;
    app2Kappa?: number;
    app3Kappa?: number;
  };
  withinAppraiser: {
    app1Repeatability: number;
    app2Repeatability: number;
    app3Repeatability: number;
  };
  betweenAppraiser: {
    app1VsApp2: number;
    app1VsApp3: number;
    app2VsApp3: number;
  };
  summary: {
    acceptableAgreement: boolean;
    recommendations: string[];
  };
}

/**
 * Calculate Cohen's Kappa coefficient for two raters
 */
function calculateCohensKappa(rater1: string[], rater2: string[]): number | null {
  if (rater1.length !== rater2.length || rater1.length === 0) return null;
  
  // Filter out blank values
  const pairs = rater1.map((val, idx) => [val, rater2[idx]])
    .filter(([a, b]) => a !== "" && b !== "");
  
  if (pairs.length === 0) return null;
  
  const n = pairs.length;
  const categories = ["OK", "KO"];
  
  // Calculate observed agreement
  const observedAgreement = pairs.filter(([a, b]) => a === b).length / n;
  
  // Calculate expected agreement
  const rater1Counts = { "OK": 0, "KO": 0 };
  const rater2Counts = { "OK": 0, "KO": 0 };
  
  pairs.forEach(([a, b]) => {
    rater1Counts[a as keyof typeof rater1Counts]++;
    rater2Counts[b as keyof typeof rater2Counts]++;
  });
  
  const expectedAgreement = categories.reduce((sum, cat) => {
    const p1 = rater1Counts[cat as keyof typeof rater1Counts] / n;
    const p2 = rater2Counts[cat as keyof typeof rater2Counts] / n;
    return sum + (p1 * p2);
  }, 0);
  
  // Calculate Kappa
  const kappa = (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
  return isNaN(kappa) ? 0 : kappa;
}

/**
 * Calculate Fleiss' Kappa for multiple raters
 */
function calculateFleissKappa(ratings: string[][]): number | null {
  if (ratings.length === 0 || ratings[0].length === 0) return null;
  
  const n = ratings.length; // number of subjects (units)
  const k = ratings[0].length; // number of raters
  const categories = ["OK", "KO"];
  
  // Create agreement matrix
  const agreementMatrix: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    const row = [0, 0]; // [OK count, KO count]
    const validRatings = ratings[i].filter(r => r !== "");
    
    validRatings.forEach(rating => {
      if (rating === "OK") row[0]++;
      if (rating === "KO") row[1]++;
    });
    
    agreementMatrix.push(row);
  }
  
  // Calculate observed agreement
  let totalPairs = 0;
  let agreementPairs = 0;
  
  agreementMatrix.forEach(row => {
    const total = row[0] + row[1];
    if (total > 1) {
      const pairs = total * (total - 1) / 2;
      totalPairs += pairs;
      agreementPairs += (row[0] * (row[0] - 1) / 2) + (row[1] * (row[1] - 1) / 2);
    }
  });
  
  if (totalPairs === 0) return null;
  
  const observedAgreement = agreementPairs / totalPairs;
  
  // Calculate expected agreement
  const totalRatings = agreementMatrix.reduce((sum, row) => sum + row[0] + row[1], 0);
  const okProportion = agreementMatrix.reduce((sum, row) => sum + row[0], 0) / totalRatings;
  const koProportion = agreementMatrix.reduce((sum, row) => sum + row[1], 0) / totalRatings;
  
  const expectedAgreement = okProportion * okProportion + koProportion * koProportion;
  
  const kappa = (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
  return isNaN(kappa) ? 0 : kappa;
}

/**
 * Calculate percent agreement between two arrays
 */
function calculatePercentAgreement(array1: string[], array2: string[]): number {
  if (array1.length !== array2.length || array1.length === 0) return 0;
  
  const pairs = array1.map((val, idx) => [val, array2[idx]])
    .filter(([a, b]) => a !== "" && b !== "");
  
  if (pairs.length === 0) return 0;
  
  const agreements = pairs.filter(([a, b]) => a === b).length;
  return (agreements / pairs.length) * 100;
}

/**
 * Calculate within-appraiser repeatability
 */
function calculateRepeatability(rep1: string[], rep2: string[], rep3?: string[]): number {
  if (rep3) {
    // Three repetitions - calculate average pairwise agreement
    const agreement12 = calculatePercentAgreement(rep1, rep2);
    const agreement13 = calculatePercentAgreement(rep1, rep3);
    const agreement23 = calculatePercentAgreement(rep2, rep3);
    
    return (agreement12 + agreement13 + agreement23) / 3;
  } else {
    // Two repetitions
    return calculatePercentAgreement(rep1, rep2);
  }
}

/**
 * Main function to calculate all MSA statistics
 */
export function calculateMSAStatistics(data: AttributeAnalysisRow[]): MSAStatistics {
  if (data.length === 0) {
    return {
      overallAgreement: { percentAgreement: 0 },
      appraiserVsStandard: {
        app1Agreement: 0,
        app2Agreement: 0,
        app3Agreement: 0
      },
      withinAppraiser: {
        app1Repeatability: 0,
        app2Repeatability: 0,
        app3Repeatability: 0
      },
      betweenAppraiser: {
        app1VsApp2: 0,
        app1VsApp3: 0,
        app2VsApp3: 0
      },
      summary: {
        acceptableAgreement: false,
        recommendations: ["Insufficient data for analysis"]
      }
    };
  }

  // Extract data arrays
  const reference = data.map(row => row.reference);
  const app1_rep1 = data.map(row => row.app1_rep1);
  const app1_rep2 = data.map(row => row.app1_rep2);
  const app1_rep3 = data.map(row => row.app1_rep3);
  const app2_rep1 = data.map(row => row.app2_rep1);
  const app2_rep2 = data.map(row => row.app2_rep2);
  const app2_rep3 = data.map(row => row.app2_rep3);
  const app3_rep1 = data.map(row => row.app3_rep1);
  const app3_rep2 = data.map(row => row.app3_rep2);
  const app3_rep3 = data.map(row => row.app3_rep3);

  // Calculate overall agreement
  const allRatings = [app1_rep1, app1_rep2, app2_rep1, app2_rep2, app3_rep1, app3_rep2];
  const validRatings = allRatings.filter(ratings => ratings.some(r => r !== ""));
  
  // For Fleiss' Kappa, transpose the data (units x raters)
  const ratingsMatrix: string[][] = [];
  for (let i = 0; i < data.length; i++) {
    ratingsMatrix.push([
      app1_rep1[i], app1_rep2[i], app2_rep1[i], 
      app2_rep2[i], app3_rep1[i], app3_rep2[i]
    ]);
  }

  const fleissKappa = calculateFleissKappa(ratingsMatrix);
  
  // Calculate overall percent agreement (average of all pairwise comparisons)
  const pairwiseAgreements: number[] = [];
  for (let i = 0; i < validRatings.length; i++) {
    for (let j = i + 1; j < validRatings.length; j++) {
      pairwiseAgreements.push(calculatePercentAgreement(validRatings[i], validRatings[j]));
    }
  }
  const overallPercent = pairwiseAgreements.length > 0 ? 
    pairwiseAgreements.reduce((sum, val) => sum + val, 0) / pairwiseAgreements.length : 0;

  // Calculate appraiser vs standard agreement
  const hasReference = reference.some(ref => ref !== "");
  
  let app1Agreement = 0, app2Agreement = 0, app3Agreement = 0;
  let app1Kappa, app2Kappa, app3Kappa;
  
  if (hasReference) {
    // Use first repetition for appraiser vs standard
    app1Agreement = calculatePercentAgreement(reference, app1_rep1);
    app2Agreement = calculatePercentAgreement(reference, app2_rep1);
    app3Agreement = calculatePercentAgreement(reference, app3_rep1);
    
    app1Kappa = calculateCohensKappa(reference, app1_rep1);
    app2Kappa = calculateCohensKappa(reference, app2_rep1);
    app3Kappa = calculateCohensKappa(reference, app3_rep1);
  }

  // Calculate within-appraiser repeatability
  const app1Repeatability = calculateRepeatability(app1_rep1, app1_rep2, app1_rep3);
  const app2Repeatability = calculateRepeatability(app2_rep1, app2_rep2, app2_rep3);
  const app3Repeatability = calculateRepeatability(app3_rep1, app3_rep2, app3_rep3);

  // Calculate between-appraiser agreement
  const app1VsApp2 = calculatePercentAgreement(app1_rep1, app2_rep1);
  const app1VsApp3 = calculatePercentAgreement(app1_rep1, app3_rep1);
  const app2VsApp3 = calculatePercentAgreement(app2_rep1, app3_rep1);

  // Generate recommendations
  const recommendations: string[] = [];
  const minAcceptableAgreement = 90; // 90% threshold for acceptable agreement
  
  if (overallPercent < minAcceptableAgreement) {
    recommendations.push("Overall agreement is below 90% - consider additional appraiser training");
  }
  
  if (hasReference) {
    if (app1Agreement < minAcceptableAgreement) recommendations.push("Appraiser 1 needs calibration training");
    if (app2Agreement < minAcceptableAgreement) recommendations.push("Appraiser 2 needs calibration training");
    if (app3Agreement < minAcceptableAgreement) recommendations.push("Appraiser 3 needs calibration training");
  }
  
  if (app1Repeatability < 90) recommendations.push("Appraiser 1 shows poor repeatability");
  if (app2Repeatability < 90) recommendations.push("Appraiser 2 shows poor repeatability");
  if (app3Repeatability < 90) recommendations.push("Appraiser 3 shows poor repeatability");
  
  if (Math.min(app1VsApp2, app1VsApp3, app2VsApp3) < 90) {
    recommendations.push("Significant differences between appraisers - review measurement criteria");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Measurement system shows acceptable agreement levels");
  }

  return {
    overallAgreement: {
      percentAgreement: overallPercent,
      fleissKappa: fleissKappa || undefined
    },
    appraiserVsStandard: {
      app1Agreement,
      app2Agreement,
      app3Agreement,
      app1Kappa: app1Kappa || undefined,
      app2Kappa: app2Kappa || undefined,
      app3Kappa: app3Kappa || undefined
    },
    withinAppraiser: {
      app1Repeatability,
      app2Repeatability,
      app3Repeatability
    },
    betweenAppraiser: {
      app1VsApp2,
      app1VsApp3,
      app2VsApp3
    },
    summary: {
      acceptableAgreement: overallPercent >= minAcceptableAgreement && 
                          Math.min(app1Repeatability, app2Repeatability, app3Repeatability) >= 90,
      recommendations
    }
  };
}

/**
 * Interpret Kappa values according to standard guidelines
 */
export function interpretKappa(kappa: number): string {
  if (kappa < 0) return "Poor (worse than chance)";
  if (kappa < 0.20) return "Slight agreement";
  if (kappa < 0.40) return "Fair agreement";
  if (kappa < 0.60) return "Moderate agreement";
  if (kappa < 0.80) return "Substantial agreement";
  return "Almost perfect agreement";
}

/**
 * Get color coding for agreement percentages
 */
export function getAgreementColor(percentage: number): string {
  if (percentage >= 95) return "text-green-600";
  if (percentage >= 90) return "text-yellow-600";
  return "text-red-600";
}