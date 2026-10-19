author of this doc: ETBlue (hand written)

the problem I want to solve:
* as a citizen, I want to participate in policy discussions, but I don't know other target audiences' concerns, so my opinions may be limited and useless. I want to be able to get an overview of the whole picture of all possible concerns from all stakeholders around the policy, so that I can improve the quality of my opinions during citizen participation

other concerns:
* although the app is for citizens, it could be helpful for gov workers who need to deal with multiple policies too. if the policy analysis phase can be recorded in a standardized format, then the stakeholder research content can become structured data, and civil servants can lookup the analysis of previous related issues in an app like this. in this way, the analysis result may be reused and reduce civil servants' workload in future policy analysis phases
* if the stakeholder analysis result can become structured data, it can become part of the open data released by the government too. civic tech communities and businesses can use the data in their own research or feature analysis phase when they have stakeholders or concerns similar to any of the policies. for example, a Taiwanese business "呼叫小黃" may be interested in the stakeholders related to spaces around sidewalks so that they can give better suggestions to passengers about the pickup location
* in the future, if the government builds a digital twin of Taipei city (mentioned by Puma in an intervew), the stakeholders' pov in the analysis can be used on the evaluation of the simulated solutions in the digial twin

directions:
* I want to have an UI to browse the issue analysis result in a structured way. as a hackathon submission, the content will come from the analysis folder of this repo. my raw idea is to retrieve structured data from the analysis result, and build a web page that can browse the structured data easily
* the app can be named as "市政提案小幫手", since the goal is to help people with building proposals. I had built an app named "審稿小幫手", so I think it is easier for people to remember if we follow the same naming pattern
* license for source code: MIT. license for content I produced: CC-BY 4.0. license for content from the hackathon host: depends on the host

information architecture:
* the app header should include: app name (link to home), "議題" with count, "利害關係人" with count, "解法" with count, and theme toggle on the right
* home page should include: a full-width hero section with background images or colors, providing a brief intro of the app (disclaimers are in footer, not here), followed by 3 call-to-action block (3 columns on desktop, 1 column on mobile) -- 
  * "最近更新的議題", showing latest updated issues, with a link guiding users to the issue list page
  * "最近加入分析的族群", showing latest added stakeholders, with a link guiding users to the stakeholder list page
  * "最近分析出的解法", showing latest formed solutions, with a link guiding users to the solution list page
* if there are solutions from cross issue analysis, add the cross issue solutions to the app
* the global page footer should include
  1. a brief description of the context of the app
  2. disclaimer
  3. a link to about page
* the about page should include
  * link to the official hackathon event page
  * link to GitHub repo
  * license info
  * links to the open data used by the app (the json/csv files in the issue analysis folders)
  * related blog posts from the author
    1. https://etblue.blogspot.com/2026/10/puma-taipei-debug-hackathon-issue-analysis.html
* entities with unique urls
  * issue
  * stakeholder
    * user story
    * user want (訴求, refers to "我想要")
    * user need (需求, refers to "以便")
  * solution
* the issue page should include
  * a tab menu: overview, 訴求 with count and conflicting count, 需求 with count, solutions with count
* the stakeholder page should include
  * a tab menu: overview, 訴求 with count and conflicting count, 需求 with count, solutions with count
* the solution page should include
  * a tab menu: overview, user needs with fulfilled / not fulfilled count, stakeholders with covered / not covered count

visual:
* for the UI, use design tokens for theme maintainence. apply "solarized light" theme to the app, with "solarized dark" theme togglable
* render a watermark on the app, so every screenshot can see it. the watermark could be: "市政 debug 松參加者作品・展示用 MVP"
* for all "議題", "利害關係人" and "解法" in list view, reuse shared card components. e.g. IssueCard, SolutionCard. the card components support 2 variations: detailed view and compact view
