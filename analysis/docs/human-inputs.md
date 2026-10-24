author of this doc: ETBlue (hand written)

## ETBlue's objective
I would like to patch hackathon issues with feature analysis skills I'm using in business world. to achieve that goal, I need to analyze all issues, so that other participants can build their proposal based on the analysis if they want to

## ontology
* physical entities
  * space
  * stakeholder
* conceptual entities
  * issue
  * solution
  * stakeholder story (user story): a sentence with fixed format that encourages humans to clarify their wants and needs
  * stakeholder's want: a raw idea of the possible solution of the issue
  * stakeholder's need: the benefit human gets, aka the real user need. should be prioritized for solution brainstorming
  * conflicting stakeholder's want: a group of user wants that conflict with each other
  * shared stakeholder's want: a group of user wants that shared across different stakeholders
  * shared stakeholder's need: a group of user needs that shared across different stakeholders. note that user needs will not conflict, as they are about personal benefits, not about real world solutions. a user need should never go beyond the boundery of the stakeholder herself
* relations
  * issue -- many to many -- space
  * issue -- many to many -- stakeholder
  * issue -- many to many -- solution
  * stakeholder -- one to many -- story
  * stakeholder -- many to many -- want
  * stakeholder -- many to many -- need
  * story -- many to one -- want
  * story -- many to one -- need
  * solution -- many to many -- need
  * want -- many to many -- conflicting want
  * want -- many to one -- shared want
  * need -- many to one -- shared need

## methodology in brief
* gather possible stakeholders
* then gather raw ideas and real user needs from stakeholders
* then clarify priority by evaluating the importance of user needs
* then brainstorm solutions based on raw ideas and prioritized user needs
* then evaluate solutions

## steps to analyze the issues
### step 1 gather possible stakeholders
* list all possible stakeholders for each issue
* the stakeholder list should consider but not limited to the following: people from organizations (industry, government, academic, non-profit) and individuals (residents, elderly, people with disabilities, parents with strollers, night-shift workers, tourists, foreigners living in Taiwan... etc.)
* the stakeholder definition should be as specific as possible
* list possible input sources for each stakeholder, e.g. "市長，你給我聽好了" messages, "[台北市陳情系統 1999](https://1999.gov.taipei)" for people who know how to use 1999 and who complain often, citizen-made report tools, foreign resident groups and community pages, 里長 and 里辦公處, a short survey, or watching the place in person... etc.
* "主辦方／政策組" should be excluded from stakeholders, as their inputs represent various stakeholders participated in the "市長，你給我聽好了" event
### step 2 gather raw ideas and real user needs from stakeholders
* collect user stories for each stakeholder with "as a... (stakeholder), I want to... (what the stakeholder thinks the solution should be), so that I can... (the real world benefit the stakeholder can get by implementing the solution)" format, presented in a table. caution: it's very easy for human to misplace "I want to (wants)" and "so that I can (needs)". if the original input put "wants" in "so that I can" or vice versa, rewrite the content into the right format and mark as [AI整理]
* the content in the issue text becomes a story under the stakeholder it most likely speaks for. tag it [實證] with the source "題目原文"
* when an "I want to" belongs to multiple stakeholders, file user story under all stakeholders to make sure the solution-stakeholder mapping stays alive when people need to trace the decision making process in the future
* each user story keeps the stakeholder's own "so that I can"
### step 3 discover real user needs and gather more stakeholders
* take the "I want to" part as a possible solution, and the "so that I can" part as the starting point of digging in real user needs
* discuss and explore the "so that I can" part with the stakeholder. if new stakeholders pop up during the exploration, add them to the stakeholder list and collect user stories from them too
### step 4 finalize user stories
* add the extended user stories gathered during the exploration to the table, and give every user story a number, grouped by stakeholder. e.g. O03-US02 (organization stakeholder 3, user story 2) or I01-US04 (individual stakeholder 1, user story 4)
* a stakeholder found in step 3 gets the next free number in its own group
### step 5 clarify priority by evaluating the importance of user needs
* prioritize the user needs by discussing with stakeholders about their needs
* when there are multiple stakeholders asking for the same user need ("so that I can"), consider all of them for priority arrangement and group them into a shared user need
* do not use quantitative methods like scores, weights, ranks, or formulas when prioritizing qualitative inputs
### step 6 brainstorm solutions based on raw ideas and prioritized user needs
* brainstorm solutions that can fulfill as many prioritized user needs as possible. take stakeholders' raw ideas (user wants) as a starting point, and search on the internet to see if other cities or countries have innovative approaches that we can borrow. when mentioning solutions from other countries, always mention country name. exclude countries under totalitarian regimes like China, Iran, North Korea, as their information is not transparent and may be fake on purpose. Hong Kong before July 1st 1997 is counted as Hong Kong itself, while after July 1st 1997 counted as China
* when there are conflicts between user wants from different stakeholders, find a way to resolve the conflicts by forging a solution based on user needs and bypass the disagreed user wants (aka raw ideas of the solution). if the disagreement can't be resolved, introduce deliberative democracy methods to grow consensus. the appropriate deliberative democracy methods may vary, depends on the nature of the issue. in real world city governance, the team needs to consult professionals
* each solution should include the user needs it maps to and the methods for success measure. for each measure, add the current value (baseline) and the data source
* ideas from 沈伯洋 go straight into this step, with the source cited
### step 7 evaluate solutions
* for each solution, calculate
  * related laws
  * privacy issues
  * other possible concerns and risks
  * feasibility
  * execution plans
    * the owner department for each solution
    * required data/api/resources
    * cost
* for risk evaluation, include disasters related to the issue. e.g.
  * natural disasters like earthquake, typhoon, landslide, flood, wildfire, drought, heat/cold wave... etc.
  * man-made disasters like fire, gas explosion, traffic accident, cyber attack, infiltration and subversion from China, military invasion from China... etc.

## what ETBlue expects the AI agent to do
* simulate the steps above. when finished, generate a summary of the analysis, focusing on: hard decisions, possible controversies when the solutions deployed, heavily affected disadvantaged groups, legal blockers, dependencies and conflicts with existing policies
* mark missing human inputs with placeholders or mock content ([實證], [AI整理] or [AI模擬])
* save the artifact in .md format, and put the files in the issue folder (e.g. `/analysis/1-trees`)
* when it comes to step 5, use the same prioritization method for all issues (MoSCoW for now)
* write all artifacts in zh-TW
* take issue #2 as pilot and then expand all other 5 issues. use the #2 pilot as the format model for the other issues, including the CSV file
* place template files (.md and .csv) in issue #7 folder, and a README file in the analysis folder as a quick intro for other hackathon participants
* the hackathon host provided their data collected from "市長，你給我聽好了" event. the data is confidential and cannot be shared with the public. I put the data in folder `.confidential` and ignored it in git. use the data in the issue analysis process
* there is an extra folder `8-smokefree` which is for the "無菸城市" policy from current Taipei City government. because it's related to issue #1, #2 and #5, I would like the AI agent to gather information from the internet and do the analysis for this issue too
* for each issue, when the analysis is done, check if any stakeholder shared with other issues. if yes, run an extra analysis against multiple issues with shared stakeholders and put results in the `analysis/cross-issue` folder. when running cross issue analysis, combine sulutions from individual issues if possible. for example, the 參與式選址 events for trees, trash cans and smoke areas could be planned together

## what ETBlue wants to do with the analysis output
I would like to share the results on hackathon Discord before the event, so that other participants have time to read the content if they want to. I want the hackathon to have the best possible outcome -- becoming a successful demo of future open government initiative in Taipei
