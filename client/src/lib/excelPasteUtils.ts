// Excel paste utilities for data import

export interface ParsedExcelData {
  success: boolean;
  data: number[][];
  errors: string[];
}

/**
 * Converts French decimal format (comma) to standard format (dot)
 */
export function convertFrenchDecimal(value: string): string {
  return value.replace(/,/g, '.');
}

/**
 * Parses a numeric value, handling French decimal format
 */
export function parseNumericValue(value: string | number): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  
  const cleaned = convertFrenchDecimal(value.trim());
  const parsed = parseFloat(cleaned);
  
  return parsed;
}

/**
 * Detects the delimiter used in pasted data
 * Excel uses tabs, CSV uses commas
 * Smart detection to avoid confusing French decimal comma with column delimiter
 */
export function detectDelimiter(text: string): string {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const firstLine = lines[0] || '';
  
  if (firstLine.includes('\t')) {
    return '\t';
  }
  
  if (firstLine.includes(';')) {
    return ';';
  }
  
  if (firstLine.includes(',')) {
    const frenchDecimalPattern = /^\s*-?\d+,\d+\s*$/;
    const integerPattern = /^\s*-?\d+\s*$/;
    
    const allLinesAreSingleValues = lines.every(line => {
      const trimmed = line.trim();
      return frenchDecimalPattern.test(trimmed) || integerPattern.test(trimmed);
    });
    
    const hasAnyFrenchDecimal = lines.some(line => frenchDecimalPattern.test(line.trim()));
    
    if (allLinesAreSingleValues && hasAnyFrenchDecimal) {
      return '\n';
    }
    
    return ',';
  }
  
  return '\n';
}

/**
 * Parses pasted Excel/CSV data into a 2D array of numbers
 * Handles both tab-separated (Excel) and comma-separated (CSV) formats
 * Supports French decimal format (comma as decimal separator)
 */
export function parseExcelPaste(pastedText: string): ParsedExcelData {
  const errors: string[] = [];
  const data: number[][] = [];
  
  if (!pastedText || pastedText.trim() === '') {
    return {
      success: false,
      data: [],
      errors: ['No data to paste'],
    };
  }
  
  const delimiter = detectDelimiter(pastedText);
  
  const lines = pastedText.split('\n').filter(line => line.trim() !== '');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cells = delimiter === '\n' ? [line] : line.split(delimiter);
    const row: number[] = [];
    
    for (let j = 0; j < cells.length; j++) {
      const cell = cells[j].trim();
      
      if (cell === '') {
        continue;
      }
      
      const value = parseNumericValue(cell);
      
      if (isNaN(value)) {
        errors.push(`Row ${i + 1}, Column ${j + 1}: "${cell}" is not a valid number`);
      } else {
        row.push(value);
      }
    }
    
    if (row.length > 0) {
      data.push(row);
    }
  }
  
  return {
    success: errors.length === 0,
    data,
    errors,
  };
}

/**
 * Parses single-column pasted data into an array of numbers
 */
export function parseSingleColumnPaste(pastedText: string): ParsedExcelData {
  const result = parseExcelPaste(pastedText);
  
  if (!result.success) {
    return result;
  }
  
  const singleColumn: number[] = [];
  
  for (const row of result.data) {
    singleColumn.push(...row);
  }
  
  return {
    success: result.success,
    data: [singleColumn],
    errors: result.errors,
  };
}

/**
 * Parses two-column pasted data (X, Y) into separate arrays
 */
export function parseTwoColumnPaste(pastedText: string): {
  success: boolean;
  columnX: number[];
  columnY: number[];
  errors: string[];
} {
  const result = parseExcelPaste(pastedText);
  
  const columnX: number[] = [];
  const columnY: number[] = [];
  const errors = [...result.errors];
  
  if (!result.success) {
    return {
      success: false,
      columnX: [],
      columnY: [],
      errors,
    };
  }
  
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    
    if (row.length === 1) {
      columnX.push(row[0]);
    } else if (row.length >= 2) {
      columnX.push(row[0]);
      columnY.push(row[1]);
    } else {
      errors.push(`Row ${i + 1}: Expected 1 or 2 columns, found ${row.length}`);
    }
  }
  
  if (columnY.length === 0 && columnX.length > 0) {
    return {
      success: true,
      columnX,
      columnY: [],
      errors: [],
    };
  }
  
  if (columnX.length !== columnY.length) {
    errors.push(`Mismatch: ${columnX.length} X values but ${columnY.length} Y values`);
    return {
      success: false,
      columnX: [],
      columnY: [],
      errors,
    };
  }
  
  return {
    success: errors.length === 0,
    columnX,
    columnY,
    errors,
  };
}
