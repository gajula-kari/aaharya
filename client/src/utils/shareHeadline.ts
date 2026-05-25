/**
 * Generates headline and subtext for the share card based on indulgent days
 * and monthly goal. Implements the spec's copy table with warm, honest tone.
 */
export interface ShareHeadlineText {
  headline: string
  subtext: string
}

export function generateHeadline(
  indulgentDays: number,
  monthlyGoal: number | null
): ShareHeadlineText {
  // No goal set
  if (monthlyGoal === null) {
    const dayWord = indulgentDays === 1 ? 'day' : 'days'
    return {
      headline: 'a mindful month.',
      subtext: `${indulgentDays} indulgent ${dayWord} logged.`,
    }
  }

  // Clean month (zero indulgent days)
  if (indulgentDays === 0) {
    return {
      headline: 'a clean month.',
      subtext: 'not a single indulgent day.',
    }
  }

  // Well within limit (≤ 50% of goal)
  if (indulgentDays <= monthlyGoal * 0.5) {
    const timeWord = indulgentDays === 1 ? 'time' : 'times'
    return {
      headline: 'a mindful month.',
      subtext: `indulged ${indulgentDays} ${timeWord}. gave myself ${monthlyGoal}.`,
    }
  }

  // Within limit
  if (indulgentDays <= monthlyGoal) {
    const dayWord = indulgentDays === 1 ? 'day' : 'days'
    return {
      headline: 'stayed within my limit.',
      subtext: `${indulgentDays} of ${monthlyGoal} indulgent ${dayWord} used.`,
    }
  }

  // Over by exactly one
  if (indulgentDays === monthlyGoal + 1) {
    return {
      headline: 'almost stayed within it.',
      subtext: 'went over by one. being honest about it.',
    }
  }

  // Over by more than one
  return {
    headline: 'an indulgent month.',
    subtext: 'being honest about it. next month starts fresh.',
  }
}
