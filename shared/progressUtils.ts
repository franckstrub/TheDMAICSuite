/**
 * Utility functions for working with project progress and phases
 */

// Define the phase types
export type DmaicPhase = 'define' | 'measure' | 'analyze' | 'improve' | 'control';
export type OtherPhase = 'planning' | 'completed';
export type PhaseType = DmaicPhase | OtherPhase;

// Define the progress values for each DMAIC phase
export const PHASE_PROGRESS_MAP: Record<PhaseType, number> = {
  'define': 20,   // Define phase = 20% progress
  'measure': 40,  // Measure phase = 40% progress
  'analyze': 60,  // Analyze phase = 60% progress
  'improve': 80,  // Improve phase = 80% progress
  'control': 100, // Control phase = 100% progress
  // Default phases - use these as fallbacks
  'planning': 10,
  'completed': 100,
};

/**
 * Calculate progress percentage based on the current phase
 * @param currentPhase The current DMAIC phase of the project
 * @param hasAllMilestoneDates Whether all milestone dates are filled
 * @returns Progress percentage (0-100)
 */
export function calculateProgressFromPhase(
  currentPhase: string, 
  hasAllMilestoneDates: boolean = false
): number {
  // Normalize the phase name to lowercase for matching
  const phase = currentPhase.toLowerCase() as PhaseType;
  
  // Check if the phase exists in our map
  if (Object.keys(PHASE_PROGRESS_MAP).includes(phase)) {
    // If all milestone dates are set and we're in the control phase,
    // the project is 100% complete
    if (phase === 'control' && hasAllMilestoneDates) {
      return 100;
    }
    
    return PHASE_PROGRESS_MAP[phase];
  }
  
  // Default to 10% if phase is not recognized
  return 10;
}

/**
 * Checks if a project has all its milestone dates set
 * 
 * @param charter The project charter with milestone dates
 * @returns boolean indicating if all milestone dates are set
 */
export function hasAllMilestoneDates(charter: any): boolean {
  // Check if all these dates exist and are not empty
  const requiredDates = [
    'kick_off_date',
    'define_phase_date',
    'measure_phase_date',
    'analyze_phase_date',
    'improve_phase_date',
    'control_phase_date',
  ];
  
  return requiredDates.every(date => 
    charter[date] && charter[date].trim() !== ''
  );
}

/**
 * Determines the most advanced phase a project is in based on its milestone dates
 * 
 * @param charter The project charter with milestone dates
 * @returns The most advanced phase that has a date set
 */
export function determinePhaseFromMilestoneDates(charter: any): string {
  // Check dates in reverse order - the most advanced phase with a date is the current one
  
  if (charter.control_phase_date && charter.control_phase_date.trim() !== '') {
    return 'control';
  }
  
  if (charter.improve_phase_date && charter.improve_phase_date.trim() !== '') {
    return 'improve';
  }
  
  if (charter.analyze_phase_date && charter.analyze_phase_date.trim() !== '') {
    return 'analyze';
  }
  
  if (charter.measure_phase_date && charter.measure_phase_date.trim() !== '') {
    return 'measure';
  }
  
  if (charter.define_phase_date && charter.define_phase_date.trim() !== '') {
    return 'define';
  }
  
  // Default to define if no phases have dates
  return 'define';
}