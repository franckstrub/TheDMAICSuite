import jStat from 'jstat';

/**
 * DOE Factor definition - supports both continuous and categorical factors
 */
export type DOEFactor =
  | { name: string; type: "continuous"; lowValue: number; highValue: number; units?: string }
  | { name: string; type: "categorical"; levels: string[] };

/**
 * DOE Plan row (one experimental run)
 */
export interface DOEPlanRow {
  standardOrder: number;
  runOrder: number;
  [key: string]: number | string; // Factor columns with coded values (-1, 0, +1)
}

/**
 * Main effect result
 */
export interface MainEffect {
  factor: string;
  effect: number;
  absoluteEffect: number;
}

/**
 * Interaction effect result
 */
export interface InteractionEffect {
  factorA: string;
  factorB: string;
  interaction: string;
  effect: number;
  absoluteEffect: number;
}

/**
 * ANOVA table row for DOE
 */
export interface DOEAnovaRow {
  source: string;
  df: number;
  ss: number;
  ms: number;
  fValue: number | null;
  pValue: number | null;
  significant: boolean;
}

/**
 * Full factorial design result
 */
export interface FullFactorialPlan {
  plan: DOEPlanRow[];
  factors: DOEFactor[];
  designType: string;
  k: number; // Total number of factors in 2^k design
}

/**
 * Fractional factorial design result
 */
export interface FractionalFactorialPlan {
  plan: DOEPlanRow[];
  factors: DOEFactor[];
  designType: string;
  definingRelation: string;
  resolution: number;
  k?: number;
  p?: number;
  generators?: string[];
  aliases?: string[];
}

/**
 * Generate a full factorial design (2^k)
 * 
 * @param factors Array of factor definitions
 * @param centerPoints Number of center points to add (default 0)
 * @param randomize Whether to randomize run order (default true)
 * @param replicates Number of replicates (default 1)
 * @returns Full factorial design plan
 */
export function generateFullFactorialPlan(
  factors: DOEFactor[],
  centerPoints: number = 0,
  randomize: boolean = true,
  replicates: number = 1
): FullFactorialPlan {
  const k = factors.length;
  const n = Math.pow(2, k); // Total runs in full factorial
  
  const plan: DOEPlanRow[] = [];
  
  // Generate all combinations of -1 and +1 following Yates standard order
  // In Yates order, the last factor changes fastest
  for (let i = 0; i < n; i++) {
    const row: DOEPlanRow = {
      standardOrder: i + 1,
      runOrder: i + 1, // Will be shuffled if randomize is true
    };
    
    // For each factor, determine if it's at low (-1) or high (+1) level
    // Use reversed bit positions so the last factor changes fastest (Yates order)
    for (let j = 0; j < k; j++) {
      const factorName = factors[j].name;
      // Factor j uses bit position (k-1-j) for Yates standard order
      const bitPosition = k - 1 - j;
      const level = (i & (1 << bitPosition)) ? 1 : -1;
      row[factorName] = level;
    }
    
    plan.push(row);
  }
  
  // Add center points if requested
  // For categorical factors, center points must be doubled (one at each level)
  const categoricalFactors = factors.filter(f => f.type === 'categorical');
  const continuousFactors = factors.filter(f => f.type === 'continuous');
  
  if (centerPoints > 0) {
    if (categoricalFactors.length === 0) {
      // All continuous: standard center points
      for (let i = 0; i < centerPoints; i++) {
        const row: DOEPlanRow = {
          standardOrder: n + i + 1,
          runOrder: n + i + 1,
        };
        
        // All factors at center level (0)
        for (const factor of factors) {
          row[factor.name] = 0;
        }
        
        plan.push(row);
      }
    } else {
      // Has categorical factors: create center points for each combination of categorical levels
      const numCategoricalCombinations = Math.pow(2, categoricalFactors.length);
      
      for (let i = 0; i < centerPoints; i++) {
        for (let combo = 0; combo < numCategoricalCombinations; combo++) {
          const row: DOEPlanRow = {
            standardOrder: n + (i * numCategoricalCombinations) + combo + 1,
            runOrder: n + (i * numCategoricalCombinations) + combo + 1,
          };
          
          // Continuous factors at center level (0)
          for (const factor of continuousFactors) {
            row[factor.name] = 0;
          }
          
          // Categorical factors at low (-1) or high (+1) based on combination
          for (let j = 0; j < categoricalFactors.length; j++) {
            const level = (combo & (1 << j)) ? 1 : -1;
            row[categoricalFactors[j].name] = level;
          }
          
          plan.push(row);
        }
      }
    }
  }
  
  // Replicate the plan if requested
  if (replicates > 1) {
    const basePlan = [...plan];
    const baseRunCount = basePlan.length;
    
    for (let rep = 1; rep < replicates; rep++) {
      basePlan.forEach((row, idx) => {
        const replicatedRow: DOEPlanRow = {
          standardOrder: baseRunCount * rep + idx + 1,
          runOrder: baseRunCount * rep + idx + 1,
        };
        
        // Copy all factor levels
        for (const factor of factors) {
          replicatedRow[factor.name] = row[factor.name];
        }
        
        plan.push(replicatedRow);
      });
    }
  }
  
  // Randomize run order if requested
  if (randomize) {
    const runOrders = plan.map((_, idx) => idx + 1);
    // Fisher-Yates shuffle
    for (let i = runOrders.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [runOrders[i], runOrders[j]] = [runOrders[j], runOrders[i]];
    }
    
    plan.forEach((row, idx) => {
      row.runOrder = runOrders[idx];
    });
    
    // Sort by run order for display
    plan.sort((a, b) => a.runOrder - b.runOrder);
  }
  
  // Calculate actual number of center point runs (doubled for each categorical factor)
  const actualCenterPointRuns = centerPoints > 0 && categoricalFactors.length > 0
    ? centerPoints * Math.pow(2, categoricalFactors.length)
    : centerPoints;
  
  return {
    plan,
    factors,
        designType: ` Full Factorial${actualCenterPointRuns > 0 ? ` with ${actualCenterPointRuns} center point runs` : ''}`,
    k,
  };
}

/**
 * Generate a fractional factorial design (2^(k-p))
 * 
 * @param factors Array of factor definitions
 * @param resolution Design resolution (III, IV, or V)
 * @param centerPoints Number of center points to add (default 0)
 * @param randomize Whether to randomize run order (default true)
 * @param replicates Number of replicates (default 1)
 * @returns Fractional factorial design plan
 */
export function generateFractionalFactorialPlan(
  factors: DOEFactor[],
  p: number,
  centerPoints: number,
  randomize: boolean,
  replicates: number
): FractionalFactorialPlan {
  const k = factors.length;
  
  // Determine the fraction based on number of factors and resolution
  let resolution = 0;
  let generators: string[] = [];
  let definingRelation = '';
  
  if ((k === 3) && (p === 1)) {
    // 2^(3-1) design, Resolution III
    resolution = 3;
    generators = ['C=AB'];
    definingRelation = 'I = ABC';
  } else if (k === 4) {
    if (p === 1) {
      // 2^(4-1) design, Resolution IV
      resolution = 4;    
      generators = ['D=ABC'];
      definingRelation = 'I = ABCD';
    }
  } else if (k === 5) {
    if (p === 1) {
    // 2^(5-1) design, Resolution V
    resolution = 5;
    generators = ['E=ABCD'];
    definingRelation = 'I = ABCDE';
    }
    else if (p === 2) {
    // 2^(5-2) design, Resolution III
    resolution = 3;
    generators = ['D=AB', 'E=AC'];
    definingRelation = 'I = ABD = ACE = BCDE';
    }
  } else if (k === 6) {
    if (p ===1) {
    // 2^(6-1) design, Resolution V
    resolution= 5;
    generators = ['F=ABCDE'];
    definingRelation = 'I = ABCDEF';
    }
    else if (p === 2) {
    // 2^(6-2) design, Resolution IV
    resolution = 4;
    generators = ['E=ABC', 'F=BCD'];
    definingRelation = 'I = ABCE = BCDF = ADEF';
    }
    else if (p === 3) {
    // 2^(6-3) design, Resolution III
    resolution = 3;
    generators = ['D=AB', 'E=AC', 'F=BC'];
    definingRelation = 'I = ABD = ACE = BCF = DE = DF = EF';
    }
  } else if (k === 7) {
    if (p === 1) {    
    // 2^(7-1) design, Resolution VII
    resolution = 7;
    generators = ['G=ABCDEF'];
    definingRelation = 'I = ABCDEFG';
    } else if (p === 2) {
    // 2^(7-2) design, Resolution IV
    resolution = 4;
    generators = ['F=ABCD', 'G=BCDE'];
    definingRelation = 'I = ABCD = BCDE = AEFG';
  } else if (p === 3) {
    // 2^(7-3) design, Resolution IV
    resolution = 4;
    generators = ['E=ABC', 'F=BCD', 'G=ACD'];
    definingRelation = 'I = ABCE = BCDF = ACDG';
  } else if (p === 4) {
    // 2^(7-4) design, Resolution III
    resolution = 3;
    generators = ['D=AB', 'E=AC', 'F=BC', 'G=AD'];
    definingRelation = 'I = ABD = ACE = BCF = ADG';
    }
  } else if (k === 8) {
    if (p === 1) {    
    // 2^(8-1) design, Resolution VIII
    resolution = 8;
    generators = ['H=ABCDEFG'];
    definingRelation = 'I = ABCDEFGH';
    } else if (p === 2) {
    // 2^(8-2) design, Resolution V
    resolution = 5;
    generators = ['G=ABCD', 'H=BCDE'];
    definingRelation = 'I = ABCD = BCDE = AFGH';
  } else if (p === 3) {
    // 2^(8-3) design, Resolution IV
    resolution = 4;
    generators = ['F=ABC', 'G=BCD', 'H=ACD'];
    definingRelation = 'I = ABCE = BCDF = ACDG';
  } else if (p === 4) {
    // 2^(8-4) design, Resolution IV
    resolution = 4;
    generators = ['E=AB', 'F=AC', 'G=BC', 'H=AD'];
    definingRelation = 'I = ABE = ACF = BCG = ADH';
    }
  } else if (k === 9) {
    if (p === 2) {
    // 2^(9-2) design, Resolution VI
    resolution = 6;
    generators = ['H=ABCD', 'I=BCDE'];
    definingRelation = 'I = ABCD = BCDE = AFGH';
    }
    else if (p === 3) {
    // 2^(9-3) design, Resolution IV
    resolution = 4;
    generators = ['G=ABC', 'H=BCD', 'I=ACD'];
    definingRelation = 'I = ABCE = BCDF = ACDG';
    } else if (p === 4) {
    // 2^(9-4) design, Resolution IV
    resolution = 4;
    generators = ['F=AB', 'G=AC', 'H=BC', 'I=AD'];
    definingRelation = 'I = ABF = ACG = BCH = ADI';
    } else if (p === 5) {
    // 2^(9-5) design, Resolution III
    resolution = 3;
    generators = ['E=AB', 'F=AC', 'G=BC', 'H=AD', 'I=AE'];
    definingRelation = 'I = ABE = ACF = BCG = ADH = AEI';
    }
  } else if (k === 10) {
    if (p === 3) {
    // 2^(10-3) design, Resolution V
    resolution = 5;
    generators = ['H=ABCD', 'I=BCDE', 'J=CDEF'];
    definingRelation = 'I = ABCD = BCDE = CDEF = AFGH';
    } else if (p === 4) {
    // 2^(10-4) design, Resolution IV
    resolution = 4;
    generators = ['G=ABC', 'H=BCD', 'I=ACD', 'J=ADE'];
    definingRelation = 'I = ABCE = BCDF = ACDG = ADEJ';
    } else if (p === 5) {
    // 2^(10-5) design, Resolution IV
    resolution = 4;
    generators = ['F=AB', 'G=AC', 'H=BC', 'I=AD', 'J=AE'];
    definingRelation = 'I = ABF = ACG = BCH = ADH = AEI';
    } else if (p === 6) {
    // 2^(10-6) design, Resolution III
    resolution = 3;
    generators = ['E=AB', 'F=AC', 'G=BC', 'H=AD', 'I=AE', 'J=AF'];
    definingRelation = 'I = ABE = ACF = BCG = ADH = AEI = AFJ';
    }
  } else {
    // For other cases, generate full factorial
    return {
      ...generateFullFactorialPlan(factors, centerPoints, randomize),
      definingRelation: 'Full Factorial',
      resolution,
    };
  }
  
  const baseFactors = k - p;
  const n = Math.pow(2, baseFactors); // Runs in fractional factorial
  
  const plan: DOEPlanRow[] = [];
  
  // Generate base factorial design for first (k-p) factors following Yates standard order
  for (let i = 0; i < n; i++) {
    const row: DOEPlanRow = {
      standardOrder: i + 1,
      runOrder: i + 1,
    };
    
    // Set base factors using Yates order (last factor changes fastest)
    for (let j = 0; j < baseFactors; j++) {
      const factorName = factors[j].name;
      const bitPosition = baseFactors - 1 - j;
      const level = (i & (1 << bitPosition)) ? 1 : -1;
      row[factorName] = level;
    }
    
    // Generate additional factors using generators
    for (let g = 0; g < p; g++) {
      const generatedFactorIdx = baseFactors + g;
      const generatedFactorName = factors[generatedFactorIdx].name;
      const generator = generators[g];
      
      // Parse generator (e.g., "D=ABC" means D = A*B*C)
      // Split on '=' to get the right-hand side
      const generatorParts = generator.split('=');
      const generatorRHS = generatorParts.length > 1 ? generatorParts[1] : generator;
      
      let product = 1;
      // For each base factor, check if its letter appears in the generator RHS
      for (let j = 0; j < baseFactors; j++) {
        const baseFactorName = factors[j].name;
        // Convert factor index to letter (j=0 -> 'A', j=1 -> 'B', etc.)
        const factorLetter = String.fromCharCode(65 + j);
        // Check if the factor letter appears in the RHS (e.g., "A" in "ABC")
        if (generatorRHS.includes(factorLetter)) {
          product *= row[baseFactorName] as number;
        }
      }
      
      row[generatedFactorName] = product;
    }
    
    plan.push(row);
  }
  
  // Add center points if requested
  // For categorical factors, center points must be doubled (one at each level)
  const categoricalFactors = factors.filter(f => f.type === 'categorical');
  const continuousFactors = factors.filter(f => f.type === 'continuous');
  
  if (centerPoints > 0) {
    if (categoricalFactors.length === 0) {
      // All continuous: standard center points
      for (let i = 0; i < centerPoints; i++) {
        const row: DOEPlanRow = {
          standardOrder: n + i + 1,
          runOrder: n + i + 1,
        };
        
        // All factors at center level (0)
        for (const factor of factors) {
          row[factor.name] = 0;
        }
        
        plan.push(row);
      }
    } else {
      // Has categorical factors: create center points for each combination of categorical levels
      const numCategoricalCombinations = Math.pow(2, categoricalFactors.length);
      
      for (let i = 0; i < centerPoints; i++) {
        for (let combo = 0; combo < numCategoricalCombinations; combo++) {
          const row: DOEPlanRow = {
            standardOrder: n + (i * numCategoricalCombinations) + combo + 1,
            runOrder: n + (i * numCategoricalCombinations) + combo + 1,
          };
          
          // Continuous factors at center level (0)
          for (const factor of continuousFactors) {
            row[factor.name] = 0;
          }
          
          // Categorical factors at low (-1) or high (+1) based on combination
          for (let j = 0; j < categoricalFactors.length; j++) {
            const level = (combo & (1 << j)) ? 1 : -1;
            row[categoricalFactors[j].name] = level;
          }
          
          plan.push(row);
        }
      }
    }
  }
  
  // Replicate the plan if requested
  if (replicates > 1) {
    const basePlan = [...plan];
    const baseRunCount = basePlan.length;
    
    for (let rep = 1; rep < replicates; rep++) {
      basePlan.forEach((row, idx) => {
        const replicatedRow: DOEPlanRow = {
          standardOrder: baseRunCount * rep + idx + 1,
          runOrder: baseRunCount * rep + idx + 1,
        };
        
        // Copy all factor levels
        for (const factor of factors) {
          replicatedRow[factor.name] = row[factor.name];
        }
        
        plan.push(replicatedRow);
      });
    }
  }
  
  // Randomize run order if requested
  if (randomize) {
    const runOrders = plan.map((_, idx) => idx + 1);
    for (let i = runOrders.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [runOrders[i], runOrders[j]] = [runOrders[j], runOrders[i]];
    }
    
    plan.forEach((row, idx) => {
      row.runOrder = runOrders[idx];
    });
    
    plan.sort((a, b) => a.runOrder - b.runOrder);
  }
  
  // Calculate actual number of center point runs (doubled for each categorical factor)
  const actualCenterPointRuns = centerPoints > 0 && categoricalFactors.length > 0
    ? centerPoints * Math.pow(2, categoricalFactors.length)
    : centerPoints;
  
  const aliases = calculateAliases(k, p, generators, definingRelation);
  
  return {
    plan,
    factors,
    designType: ` Fractional Factorial (Resolution ${toRoman(resolution)})${actualCenterPointRuns > 0 ? ` with ${actualCenterPointRuns} center point runs` : ''}`,
    definingRelation,
    resolution,
    k,
    p,
    generators,
    aliases,
  };
}

/**
 * Calculate aliases for a fractional factorial design
 */
export function calculateAliases(k: number, p: number, generators: string[], definingRelation: string): string[] {
  const aliases: string[] = [];
  
  // Helper to multiply effect strings (product in GF(2))
  const multiplyEffects = (effect1: string, effect2: string): string => {
    let result = '';
    const factors = new Set([...effect1, ...effect2]);
    
    // Count each factor
    const factorCounts: { [key: string]: number } = {};
    for (const f of effect1) factorCounts[f] = (factorCounts[f] || 0) + 1;
    for (const f of effect2) factorCounts[f] = (factorCounts[f] || 0) + 1;
    
    // Keep factors with odd count (mod 2)
    for (const f of Array.from(factors).sort()) {
      if ((factorCounts[f] || 0) % 2 === 1) {
        result += f;
      }
    }
    
    return result || 'I';
  };
  
  // Get base factor names from first k characters of generators
  const baseFactors = generators.map(g => g.split('=')[0]);
  const allFactors = Array.from({ length: k }, (_, i) => String.fromCharCode(65 + i)); // A, B, C, ...
  
  // Extract main effects and their aliases
  const aliasMap: { [key: string]: string } = {};
  
  for (const factor of allFactors) {
    // For each main effect, multiply by defining relation terms
    const defTerms = definingRelation.split('=')[1]?.trim().split(/\s+/) || ['I'];
    
    for (const term of defTerms) {
      if (term !== 'I') {
        const alias = multiplyEffects(factor, term);
        if (alias && alias !== factor && alias !== 'I') {
          aliasMap[factor] = alias;
          break; // Take first non-trivial alias
        }
      }
    }
  }
  
  // Format aliases
  for (const [effect, alias] of Object.entries(aliasMap)) {
    if (alias && alias !== 'I') {
      aliases.push(`${effect} + ${alias}`);
    }
  }
  
  return aliases;
}

/**
 * Convert number to Roman numeral (for resolution)
 */
function toRoman(num: number): string {
  const romans = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  return romans[num] || num.toString();
}

/**
 * Calculate main effects for each factor
 * 
 * @param data Experiment data (must include factor columns and response column)
 * @param factors Factor names
 * @param responseColumn Name of response column
 * @returns Array of main effects
 */
export function calculateMainEffects(
  data: any[],
  factors: string[],
  responseColumn: string
): MainEffect[] {
  const effects: MainEffect[] = [];
  
  for (const factor of factors) {
    // Separate high and low level responses
    const highResponses: number[] = [];
    const lowResponses: number[] = [];
    
    for (const row of data) {
      const factorValue = row[factor];
      const response = row[responseColumn];
      
      if (response === null || response === undefined || isNaN(response)) {
        continue;
      }
      
      if (factorValue === 1 || factorValue === '1') {
        highResponses.push(Number(response));
      } else if (factorValue === -1 || factorValue === '-1') {
        lowResponses.push(Number(response));
      }
      // Ignore center points (0) for main effect calculation
    }
    
    if (highResponses.length === 0 || lowResponses.length === 0) {
      effects.push({
        factor,
        effect: 0,
        absoluteEffect: 0,
      });
      continue;
    }
    
    // Calculate averages
    const avgHigh = highResponses.reduce((sum, val) => sum + val, 0) / highResponses.length;
    const avgLow = lowResponses.reduce((sum, val) => sum + val, 0) / lowResponses.length;
    
    // Main effect = average(high) - average(low)
    const effect = avgHigh - avgLow;
    
    effects.push({
      factor,
      effect,
      absoluteEffect: Math.abs(effect),
    });
  }
  
  return effects;
}

/**
 * Calculate 2-way interaction effects for all factor pairs
 * 
 * @param data Experiment data
 * @param factors Factor names
 * @param responseColumn Name of response column
 * @returns Array of interaction effects
 */
export function calculateInteractionEffects(
  data: any[],
  factors: string[],
  responseColumn: string
): InteractionEffect[] {
  const interactions: InteractionEffect[] = [];
  
  // Generate all pairs of factors
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      const factorA = factors[i];
      const factorB = factors[j];
      
      // Calculate interaction column (A*B)
      const interactionData: { interaction: number; response: number }[] = [];
      
      for (const row of data) {
        const valueA = row[factorA];
        const valueB = row[factorB];
        const response = row[responseColumn];
        
        if (
          response === null || response === undefined || isNaN(response) ||
          valueA === 0 || valueB === 0 // Skip center points
        ) {
          continue;
        }
        
        const interactionValue = Number(valueA) * Number(valueB);
        interactionData.push({
          interaction: interactionValue,
          response: Number(response),
        });
      }
      
      if (interactionData.length === 0) {
        interactions.push({
          factorA,
          factorB,
          interaction: `${factorA}*${factorB}`,
          effect: 0,
          absoluteEffect: 0,
        });
        continue;
      }
      
      // Calculate effect: average(interaction=+1) - average(interaction=-1)
      const highResponses = interactionData
        .filter(d => d.interaction === 1)
        .map(d => d.response);
      const lowResponses = interactionData
        .filter(d => d.interaction === -1)
        .map(d => d.response);
      
      if (highResponses.length === 0 || lowResponses.length === 0) {
        interactions.push({
          factorA,
          factorB,
          interaction: `${factorA}*${factorB}`,
          effect: 0,
          absoluteEffect: 0,
        });
        continue;
      }
      
      const avgHigh = highResponses.reduce((sum, val) => sum + val, 0) / highResponses.length;
      const avgLow = lowResponses.reduce((sum, val) => sum + val, 0) / lowResponses.length;
      
      const effect = avgHigh - avgLow;
      
      interactions.push({
        factorA,
        factorB,
        interaction: `${factorA}*${factorB}`,
        effect,
        absoluteEffect: Math.abs(effect),
      });
    }
  }
  
  return interactions;
}

/**
 * Perform ANOVA for DOE
 * 
 * @param data Experiment data
 * @param factors Factor names
 * @param responseColumn Name of response column
 * @param significanceLevel Significance level (default 0.05)
 * @returns ANOVA table
 */
export function performDOEANOVA(
  data: any[],
  factors: string[],
  responseColumn: string,
  significanceLevel: number = 0.05
): DOEAnovaRow[] {
  const anovaTable: DOEAnovaRow[] = [];
  
  // Extract valid responses
  const responses: number[] = data
    .map(row => row[responseColumn])
    .filter(val => val !== null && val !== undefined && !isNaN(val))
    .map(val => Number(val));
  
  if (responses.length === 0) {
    return anovaTable;
  }
  
  // Calculate total mean and total SS
  const grandMean = responses.reduce((sum, val) => sum + val, 0) / responses.length;
  const sst = responses.reduce((sum, val) => sum + Math.pow(val - grandMean, 2), 0);
  
  let ssModel = 0;
  const n = responses.length;
  
  // Calculate main effects SS
  for (const factor of factors) {
    const highResponses: number[] = [];
    const lowResponses: number[] = [];
    
    for (const row of data) {
      const factorValue = row[factor];
      const response = row[responseColumn];
      
      if (response === null || response === undefined || isNaN(response)) {
        continue;
      }
      
      if (factorValue === 1 || factorValue === '1') {
        highResponses.push(Number(response));
      } else if (factorValue === -1 || factorValue === '-1') {
        lowResponses.push(Number(response));
      }
    }
    
    if (highResponses.length === 0 || lowResponses.length === 0) {
      anovaTable.push({
        source: factor,
        df: 1,
        ss: 0,
        ms: 0,
        fValue: null,
        pValue: null,
        significant: false,
      });
      continue;
    }
    
    const avgHigh = highResponses.reduce((sum, val) => sum + val, 0) / highResponses.length;
    const avgLow = lowResponses.reduce((sum, val) => sum + val, 0) / lowResponses.length;
    const effect = avgHigh - avgLow;
    
    // SS for main effect = (effect^2 * n) / 4
    // This formula works for balanced 2^k designs
    const ss = Math.pow(effect, 2) * n / 4;
    ssModel += ss;
    
    const ms = ss; // df = 1 for each main effect
    const dfError = n - (factors.length + 1);
    
    anovaTable.push({
      source: factor,
      df: 1,
      ss,
      ms,
      fValue: null, // Will calculate after getting MSE
      pValue: null,
      significant: false,
    });
  }
  
  // Calculate 2-way interaction effects SS
  const interactionEffects = calculateInteractionEffects(data, factors, responseColumn);
  
  for (const interaction of interactionEffects) {
    const effect = interaction.effect;
    
    // SS for interaction = (effect^2 * n) / 4
    const ss = Math.pow(effect, 2) * n / 4;
    ssModel += ss;
    
    const ms = ss;
    
    anovaTable.push({
      source: interaction.interaction,
      df: 1,
      ss,
      ms,
      fValue: null,
      pValue: null,
      significant: false,
    });
  }
  
  // Calculate error (residual) SS
  const dfModel = factors.length + interactionEffects.length;
  const dfError = n - dfModel - 1;
  const sse = Math.max(0, sst - ssModel); // Ensure non-negative
  const mse = dfError > 0 ? sse / dfError : 0;
  
  // Now calculate F-values and p-values
  for (const row of anovaTable) {
    if (mse > 0 && dfError > 0) {
      const fValue = row.ms / mse;
      const pValue = 1 - jStat.centralF.cdf(fValue, row.df, dfError);
      
      row.fValue = fValue;
      row.pValue = pValue;
      row.significant = pValue < significanceLevel;
    }
  }
  
  // Add Model row
  anovaTable.unshift({
    source: 'Model',
    df: dfModel,
    ss: ssModel,
    ms: dfModel > 0 ? ssModel / dfModel : 0,
    fValue: mse > 0 && dfModel > 0 ? (ssModel / dfModel) / mse : null,
    pValue: mse > 0 && dfModel > 0 && dfError > 0 
      ? 1 - jStat.centralF.cdf((ssModel / dfModel) / mse, dfModel, dfError)
      : null,
    significant: false,
  });
  
  if (anovaTable[0].pValue !== null) {
    anovaTable[0].significant = anovaTable[0].pValue! < significanceLevel;
  }
  
  // Add Error row
  anovaTable.push({
    source: 'Error',
    df: dfError,
    ss: sse,
    ms: mse,
    fValue: null,
    pValue: null,
    significant: false,
  });
  
  // Add Total row
  anovaTable.push({
    source: 'Total',
    df: n - 1,
    ss: sst,
    ms: n > 1 ? sst / (n - 1) : 0,
    fValue: null,
    pValue: null,
    significant: false,
  });
  
  return anovaTable;
}

/**
 * Calculate R-squared for DOE model
 * 
 * @param data Experiment data
 * @param factors Factor names
 * @param responseColumn Name of response column
 * @returns R-squared value (0 to 1)
 */
export function calculateRSquared(
  data: any[],
  factors: string[],
  responseColumn: string
): number {
  const anovaTable = performDOEANOVA(data, factors, responseColumn);
  
  const modelRow = anovaTable.find(row => row.source === 'Model');
  const totalRow = anovaTable.find(row => row.source === 'Total');
  
  if (!modelRow || !totalRow || totalRow.ss === 0) {
    return 0;
  }
  
  const rSquared = modelRow.ss / totalRow.ss;
  return Math.max(0, Math.min(1, rSquared));
}

/**
 * Get significant factors from ANOVA results
 * 
 * @param anovaResults ANOVA table
 * @param significanceLevel Significance level (default 0.05)
 * @returns Array of significant factor names
 */
export function getSignificantFactors(
  anovaResults: DOEAnovaRow[],
  significanceLevel: number = 0.05
): string[] {
  return anovaResults
    .filter(row => 
      row.source !== 'Model' && 
      row.source !== 'Error' && 
      row.source !== 'Total' &&
      row.pValue !== null &&
      row.pValue < significanceLevel
    )
    .map(row => row.source);
}

/**
 * Decode a coded value (-1, 0, +1) to actual value
 * 
 * @param codedValue Coded value (-1, 0, or +1)
 * @param factor DOE factor definition
 * @returns Decoded actual value
 */
export function decodeValue(
  codedValue: number,
  factor: DOEFactor
): number | string {
  // Handle categorical factors
  if (factor.type === 'categorical') {
    const { levels } = factor;
    if (codedValue === -1 && levels[0]) return levels[0];
    if (codedValue === 1 && levels[1]) return levels[1];
    return 'Center'; // Center for categorical
  }
  
  // Handle continuous factors with linear interpolation
  const { lowValue, highValue } = factor;
  const center = (lowValue + highValue) / 2;
  const halfRange = (highValue - lowValue) / 2;
  
  return center + codedValue * halfRange;
}

/**
 * Encode an actual value to coded value (-1, 0, +1)
 * 
 * @param actualValue Actual value
 * @param factor DOE factor definition
 * @returns Coded value (-1, 0, or +1)
 */
export function encodeValue(
  actualValue: number | string,
  factor: DOEFactor
): number {
  // Handle categorical factors
  if (factor.type === 'categorical') {
    const { levels } = factor;
    if (actualValue === levels[0]) return -1;
    if (actualValue === levels[1]) return 1;
    return 0; // Assume center if neither
  }
  
  // Handle continuous factors
  const { lowValue, highValue } = factor;
  const center = (lowValue + highValue) / 2;
  const halfRange = (highValue - lowValue) / 2;
  
  if (halfRange === 0) return 0;
  
  const coded = (Number(actualValue) - center) / halfRange;
  
  // Snap to nearest coded level
  if (coded < -0.5) return -1;
  if (coded > 0.5) return 1;
  return 0;
}
