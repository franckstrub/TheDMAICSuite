// Helper function to format percentage values
  export const formatPercentage = (value: number, dpmo: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return "N/A";
    }
    const decimalPlaces = dpmo <= 1 ? 6
      : dpmo <= 10 ? 5
      : dpmo <= 100 ? 4
      : dpmo <= 1000 ? 3
      : dpmo <= 10000 ? 2
      : 2;
  
    return `${value.toFixed(decimalPlaces)}%`;
  };