
export const calculateStats = (values: any[]) => {
  const numericValues = values
    .map(v => Number(v))
    .filter(v => !isNaN(v));

  const count = values.length;
  const validValuesCount = values.filter(v => v !== null && v !== undefined && v !== '').length;
  
  if (numericValues.length === 0) {
    return { count, values: validValuesCount, sum: null, avg: null, min: null, max: null };
  }

  const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / numericValues.length;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  return {
    count,
    values: validValuesCount,
    sum: Number(sum.toFixed(2)),
    avg: Number(avg.toFixed(2)),
    min,
    max
  };
};
