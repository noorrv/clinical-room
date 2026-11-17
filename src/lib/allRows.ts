/*
  Supabase returns at most 1,000 rows per request (the project's max-rows setting), and a longer
  result is cut off without any error. Lists that can grow past that (all questions, all topic
  links) are fetched a page at a time until a short page shows the end has been reached.
  The query must have a stable order, or rows can repeat or go missing between pages.
*/

const PAGE = 1000;

interface Paged<T> {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
}

export async function allRows<T>(query: () => Paged<T>): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: rows, error: null };
  }
}
