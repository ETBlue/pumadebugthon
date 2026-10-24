// Links to the GitHub repository.

export const REPO_URL = 'https://github.com/ETBlue/pumadebugthon'

/** analysis/docs/method.md: how to read the analysis, with the meaning of each tag. */
export const METHOD_URL = `${REPO_URL}/blob/main/analysis/docs/method.md`

/** analysis/docs/data-guide.md: the guide to the flat data files (design 3.13). */
export const DATA_GUIDE_URL = `${REPO_URL}/blob/main/analysis/docs/data-guide.md`

/** The MIT license of the code. */
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`

/** The content licenses (CC BY 4.0) and their exceptions. */
export const CONTENT_LICENSE_URL = `${REPO_URL}/blob/main/LICENSE-CONTENT.md`

/** The official event page of the hackathon (design 3.13). */
export const EVENT_URL = 'https://puma.taipei/hackathon'

/** Related blog posts by the author, for the about page (design 3.13).
 * Newest first. The title is the post's own title, like an issue title from
 * the data, so it is not in the i18n file. */
export const AUTHOR_POSTS: readonly { title: string; date: string; url: string }[] = [
  {
    title: '台北市政 debug 松議題的模擬分析',
    date: '2026-10-17',
    url: 'https://etblue.blogspot.com/2026/10/puma-taipei-debug-hackathon-issue-analysis.html',
  },
]

/** The author's hackathon demo slides, for the about page (design 3.13,
 * decision 144). Newest first. The title is the slides' own title, like a
 * post title, so it is not in the i18n file. */
export const AUTHOR_SLIDES: readonly { title: string; date: string; url: string }[] = [
  {
    title: '台北市政小幫手',
    date: '2026-10-24',
    url: 'https://docs.google.com/presentation/d/1HC_7ajRGpkBqUxn-nwBCaCWixWJHvudiaeranYaBLiM/edit?usp=sharing',
  },
]
