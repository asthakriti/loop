// Filter options. These match the values in problem_bank.csv.

export const PATTERNS = [
  'Arrays', 'Strings', 'Hashing', 'Two Pointers', 'Sliding Window', 'Binary Search', 'Sorting',
  'Linked List', 'Stack / Queue', 'Recursion', 'Trees', 'Graphs', 'Heap', 'Basic DP', 'Design',
  'Greedy', 'Bit Manipulation',
]

export const COMPANIES = [
  'Amazon', 'Google', 'Microsoft', 'Meta', 'Bloomberg', 'LinkedIn', 'Apple', 'Adobe',
  'Goldman Sachs', 'Uber', 'Flipkart',
]

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

/** Build "?a=1&b=2" from an object, skipping empty values. */
export function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== false) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
