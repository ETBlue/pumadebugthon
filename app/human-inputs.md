author of this doc: ETBlue (hand written)

the problem I want to solve:
* as a citizen, I want to participate in policy discussions, but I don't know other target audiences' concerns, so my opinions may be limited and useless. I want to be able to get an overview of the whole picture of all possible concerns from all stakeholders around the policy, so that I can improve the quality of my opinions during citizen participation

other concerns:
* although the app is for citizens, it could be helpful for gov workers who need to deal with multiple policies too. if the policy analysis phase can be done in a standardized way, then the stakeholder research content can become structured data, and civil servants can lookup the analysis of previous related issues in an app like this. in this way, the analysis result may be reused and reduce civil servants' workload in the policy analysis phase
* if the stakeholder analysis result can become structured data, it can become part of the open data released by the government. civic tech communities and businesses can use the data in their own research or feature analysis phase when they have stakeholders or concerns similar to any of the policies. for example, a Taiwanese business "呼叫小黃" may be interested in the stakeholders related to spaces around sidewalks so that they can give better suggestions to passengers about the pickup location

raw ideas:
* I want to have a UI to browse the issue analysis result in a structured way. as a hackathon submission, the content will come from the analysis folder of this repo. my raw idea is to retrieve structured data from the analysis result, and build a web page that can browse the structured data easily
* the app can be named as "提案小幫手", since the goal is to help people with building proposals. I had built an app named "審稿小幫手", so I think it is easier for people to remember if we follow the same naming pattern
* license for source code: MIT. license for content I produced: CC-BY 4.0. license for content from the hackathon host: depends on the host
* for the UI, use design tokens for theme maintainence. apply "solarized light" theme to the app, with "solarized dark" theme togglable
* the app header should include: app name (link to home), "議題" with count, "利害關係人" with count, "訴求" with count, "提案" with count, and theme toggle on the right
* home page should include: a hero section providing a brief intro of the app, followed by 3 call-to-action block -- 
  * "最近被討論的議題", showing issues with latest citizen inputs (aka gain public attention recently), with a link guiding users to the issue list page
  * "最近受影響的族群", showing latest mentioned stakeholders, with a link guiding users to the stakeholder list page
  * "最近分析出的解法", showing latest possible solutions, with a link guiding users to the solution list page
* the global page footer should include GitHub link, license info, disclaimer, and links to the open data used by the app
