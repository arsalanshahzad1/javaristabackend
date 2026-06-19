type AnyObject = Record<string, any>;

const toFrontendDifficulty = (difficulty?: string): 'beginner' | 'intermediate' | 'advanced' => {
  if (difficulty === 'easy' || difficulty === 'beginner') return 'beginner';
  if (difficulty === 'medium' || difficulty === 'intermediate') return 'intermediate';
  return 'advanced';
};

const toBackendDifficulty = (difficulty?: string): 'easy' | 'medium' | 'hard' => {
  if (difficulty === 'beginner' || difficulty === 'easy') return 'easy';
  if (difficulty === 'intermediate' || difficulty === 'medium') return 'medium';
  return 'hard';
};

const normalizeStepsForDb = (steps: AnyObject[] = []) =>
  steps.map((step, index) => ({
    stepNumber: step.stepNumber ?? step.order ?? index + 1,
    title: step.title ?? `Step ${index + 1}`,
    description: step.description ?? step.instruction ?? '',
    timerSeconds: step.timerSeconds ?? step.duration,
    waterAmount: step.waterAmount,
  }));

const normalizeStepsForUi = (steps: AnyObject[] = []) =>
  steps.map((step, index) => ({
    order: step.stepNumber ?? step.order ?? index + 1,
    instruction: step.description ?? step.instruction ?? step.title ?? '',
    duration: step.timerSeconds ?? step.duration,
  }));

export const normalizeRecipeForDb = (body: AnyObject = {}) => {
  const totalTime = body.totalTime ?? body.brewTime;

  return {
    name: body.name ?? body.title,
    description: body.description ?? undefined,
    brewMethod: body.brewMethod,
    coffeeDose: body.coffeeDose,
    waterAmount: body.waterAmount,
    ratio: body.ratio,
    grindSize: body.grindSize,
    brewTime: totalTime,
    difficulty: toBackendDifficulty(body.difficulty),
    steps: normalizeStepsForDb(body.steps),
    tags: body.tags ?? [],
    image: body.image,
    isPremium: body.isPremium ?? false,
    isPublished: body.isPublished,
    isFeatured: body.isFeatured,
  };
};

export const serializeRecipeForUi = (recipe: AnyObject | null) => {
  if (!recipe) return recipe;
  const plain = typeof recipe?.toObject === 'function' ? recipe.toObject() : recipe;

  return {
    ...plain,
    title: plain.name,
    difficulty: toFrontendDifficulty(plain.difficulty),
    totalTime: plain.brewTime ?? plain.totalTime ?? 0,
    steps: normalizeStepsForUi(plain.steps),
    likeCount: plain.likeCount ?? plain.likesCount ?? 0,
    brewCount: plain.brewCount ?? 0,
  };
};
