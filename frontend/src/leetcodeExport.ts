// A small script the user pastes into the browser console on leetcode.com (while logged in).
// It asks LeetCode's own API for the problems they solved and downloads them as a CSV
// that Loop can import. It runs in the user's browser and sends their data nowhere else.

export const LEETCODE_EXPORT_SCRIPT = `(async () => {
  const query = \`query list($skip: Int!, $limit: Int!, $filters: QuestionListFilterInput) {
    questionList(categorySlug: "", limit: $limit, skip: $skip, filters: $filters) {
      totalNum
      data { titleSlug title difficulty }
    }
  }\`;
  const csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '';
  const solved = [];
  for (let skip = 0; ; skip += 100) {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrftoken': csrf },
      body: JSON.stringify({ query, variables: { skip, limit: 100, filters: { status: 'AC' } } }),
    });
    const list = (await res.json()).data.questionList;
    solved.push(...list.data);
    if (list.data.length === 0 || solved.length >= list.totalNum) break;
  }
  if (solved.length === 0) return console.log('No solved problems found. Are you logged in to LeetCode?');
  const quote = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  const lines = solved.map((q) =>
    [q.titleSlug, quote(q.title), 'https://leetcode.com/problems/' + q.titleSlug + '/', q.difficulty].join(','));
  const csv = ['slug,title,link,difficulty', ...lines].join('\\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'leetcode_solved.csv';
  a.click();
  console.log('Saved ' + solved.length + ' solved problems to leetcode_solved.csv');
})();`
