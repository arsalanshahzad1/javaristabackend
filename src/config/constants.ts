export const getEspressoSuggestion = (tasteProfile: string): string => {
  switch (tasteProfile) {
    case 'sour':
      return 'Try grinding finer by 1 step or increase your dose slightly';
    case 'bitter':
      return 'Try grinding coarser or reduce your brew time';
    case 'balanced':
      return 'Perfect shot — save these settings as your baseline';
    default:
      return 'Adjust one variable at a time and log each result';
  }
};
