---
date: "2022-12-11T10:02:55.000Z"
title: "Transition Planning Calendar"
linkTitle: "Transition Planner"
description: "Anxiety makes some people procrastinate; it makes others over-plan."
---
{!{
<div class="text-with-margins">
}!}

## Transition Planner

I made these tools at the very start of my transition because I was stressed out and overwhelmed by the sheer number of things to schedule. As I write this about 6 months later, a lot of these weren't as hard as I first thought. My advice to anyone just starting out is to focus on just one or two areas at a time, trying to handle everything all at once leads to "where do I even start" overload.


### Medical Timelines

#### Masculinizing Hormone Therapy

| Effect                         | Expected Onset      | Expected Maximum Effect |
|----------------------------------------------------|------------------------------------|-------------------------|
| Skin oiliness/acne             | 1-6 months     | 1-2 years               |
| Facial/body hair growth        | 3-6 months     | 3-5 years               |
| Scalp hair loss                | >12 months     | variable                |
| Increased muscle mass/strength | 6-12 months    | 2-5 years               |
| Body fat redistribution        | 3-6 months     | 2-5 years               |
| Cessation of menses            | 2-6 months     | n/a                     |
| Clitoral enlargement           | 3-6 months     | 1-2 years               |
| Vaginal atrophy                | 3-6 months     | 1-2 years               |
| Deepened voice                 | 3-12 months    | 1-2 years               |

#### Feminizing Hormone Therapy

| Effects                                            | Expected Onset                     | Expected Maximum Effect |
|----------------------------------------------------|------------------------------------|-------------------------|
| Body fat redistribution                            | 3-6 months                         | 2-5 years               |
| Decreased muscle/mass strength                     | 3-6 months                         | 1-2 years               |
| Softening of skin/decreased oiliness               | 3-6 months                         | unknown                 |
| Decreased libido                                   | 1-3 months                         | 1-2 years               |
| Decreased spontaneous erections                    | 1-3 months                         | 3-6 months              |
| Male sexual dysfunction                            | variable                           | variable                |
| Breast growth                                      | 3-6 months                         | 2-3 years               |
| Decreased testicular volume                        | 3-6 months                         | 2-3 years               |
| Decreased sperm production                         | variable                           | variable                |
| Thinning and slowed growth of body and facial hair | 6-12 months                        | >3 years                |
| Male pattern baldness                              | No regrowth, loss stops 1-3 months | 1-2 years               |

[Source](https://www.gendergp.com/hrt-timelines-hormones-effects/)

### Hoop-jumps/gatekeepers

These are all based on personal experiences, geography makes a BIG difference in the hoops you need to jump through in order to access care.

#### Letter of Support

This is a letter from a therapist stating that you do in fact need medical care. Some of these requirements are being scrapped, but there tends to be a lot of confusion in medical establishments about whether these are required or not; some therapists will fill them out regardless as a precautionary measure. If your therapist uses your input to write one, BE WARNED: these are emotionally brutal. The point of a letter of support is to convince your insurance company that it's cheaper to give you transition care than it is to pay for a suicide attempt and the process was designed by cisgender insurance accountants, so "mental wellbeing" is pretty low on the list of priorities. Much of the process involves listing out in detail how different parts of your body make you feel dysphoric.

For any therapists reading this - in general, asking your clients to list out everything they dislike about themselves in exhaustive detail is not a therapeautic exercise.

Some areas only allow letters of support after a set duration of time spent with a counselor; thankfully this is relaxing in some parts of the US.
#### Hormones

In some areas you need a letter of support before going on hormones, in others you basically just have to ask for them.

#### Surgeries

Generally you need to be on Hormones for a year before an orchiectomy or feminizing bottom surgery. Anecdotally I've heard of mastectomies that don't require hormones, but more detail would be welcome here.



{!{
</div>
}!}

{!{
     <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet"  crossorigin="anonymous">
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
	 <script src="https://d3js.org/d3.v3.js"></script>   
<link type="text/css" href="http://mbostock.github.io/d3/style.css" rel="stylesheet"  crossorigin="anonymous"/>
<link type="text/css" href="/css/transition-planner.css" rel="stylesheet"  crossorigin="anonymous"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/shorthandcss@1.1.1/dist/shorthand.min.css"  crossorigin="anonymous"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Muli:200,300,400,500,600,700,800,900&display=swap" crossorigin="anonymous" />
<link rel="stylesheet" type="text/css"
    href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.9.0/slick.min.css"  crossorigin="anonymous"/>
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css"  crossorigin="anonymous"/> 
<link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet"  crossorigin="anonymous"/>
            <section id="home" class="p-10 md-p-l5">
                <div class="flex flex-column md-flex-row mx-auto">
                    <div id="mtfDiv" class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5 center" src="/transition-planner/images/mtf.png" />
                                 
                                  <!-- Trigger/Open The New MtF Modal -->
                                
                                    <div id="mtfModal" class="mtf-modal fw-600 opacity-100">
                                        <div id="mtfQuestions" class="mtf-modal-content">
                                        </div>
                                        </div>
                                        <button id="newMtFModalButton" class="pink-btn">Generate New Feminization Plan</button>
                            
                                
                        </div>
                    </div>
                    <div id="ftmDiv"  class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5 center" src="/transition-planner/images/ftm.png" />
                            
                                <!-- Trigger/Open The New FtM Modal -->
                                <div id="ftmModal" class="ftm-modal fw-600 opacity-100">
                                    <div id="ftmQuestions" class="ftm-modal-content">
                                    </div>
                                    </div>
                                    <button id="newFtMModalButton" class="pink-btn">Generate New Masculinization Plan</button>
                                
                        </div>
                    </div>
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5 center" src="/transition-planner/images/indigo upload.png" />
                             
                            <label for="file" class="trans-planner-label full-width">
                                Upload Existing Plan
                            </label>
                            <input id="file" type="file" style="display: none;"/>
                            
                        </div>
                    </div>
                </div>
            </section>

    <section id="editAndDownload" class="p-10 md-p-l5" style="display: none;">
                <div class="flex flex-column md-flex-row mx-auto">
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5 center" src="/transition-planner/images/edit calendar.png" />
                            <div class="indigo-lightest fw-600 fs-m1 lh-3 opacity-50">Edit Plan</div>
                            <!-- Trigger/Open The Edit Plan Modal -->
                                <button id="editPlanModalButton"  class="trans-planner-label full-width">Edit Transition Plan</button>
                                <div id="editPlanModal" class="edit-plan-modal">
                                    <div class="edit-plan-modal-content">
                                    <p>Make any plan changes, be sure to save your plan after!</p>
                                    <button id="closeEditsNoSave"  class="pink-button">Close Without Saving</button>
                                    <button id="finalizePlanEdits"  class="pink-button">Save Plan Changes</button>
                                    <div id="planEditTable"></div>
                                    </div>
                                </div>
                        </div>
                    </div>
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5 center" src="/transition-planner/images/indigo file download.png" />
                            <div class="indigo-lightest fw-600 fs-m1 lh-3 opacity-50">Download Plan</div>

                                <button  class="trans-planner-label full-width" onclick="downloadJSONFile()">Download My Plan</button>
                                <a id="downloadAnchorElem" style="display: none;"></a>
                        </div>
                    </div>
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5 center" src="/transition-planner/images/indigo image download.png" />
                            <div class="indigo-lightest fw-600 fs-m1 lh-3 opacity-50">Download Image</div>
        
                                <button  class="trans-planner-label full-width" id="downloadPng">Download Image</button>
                        </div>
                    </div>
                </div>
            </section>

}!}

{!{
<div class="text-with-margins">
}!}
## Disclaimer

I'M NOT A DOCTOR. Talk to an actual medical professional for transition advice, this tool is only meant to help organize the seemingly-massive number of things that need to happen in order to start transitioning. Every body is different and these timelines are rough estimates only.

Medical Timeline source information is <a href="https://www.gendergp.com/hrt-timelines-hormones-effects/">here</a>. A lot of the language used by medical professionals is pathologizing and negative, so I added more positive terms and community-reported transition effects.

This site stores no personal information (which is why you should download the transition plan once you're done and re-upload if you wish to edit/review later).


{!{
</div>
}!}

{!{


    <section id="zoomControl" class="p-10 md-p-l5" style="display: none;">
    <h1 class="black fs-l3 lh-2 md-fs-xl1 md-lh-1 fw-900 ">Your Transition Plan:</h1>
                <div class="flex flex-column md-flex-row mx-auto">
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            Start Date: <input type="date" id="graphStartDate"></input>
                        </div>
                    </div>
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                        <button  class="trans-planner-label" id="setGraphStartEnd" onclick="renderGanttChart()">Zoom</button>
                        </div>
                    </div>
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            End Date: <input type="date" id="graphEndDate"></input>
                        </div>
                    </div>
                </div>
            </section>

    <div id="ganttChartTarget"></div>

    <script type="text/javascript" src="/js/transition-planner/plan-obj-mtf.js"></script>
    <script type="text/javascript" src="/js/transition-planner/plan-obj-ftm.js"></script>
    <script type="text/javascript" src="/js/transition-planner/json-upload.js"></script>
    <script type="text/javascript" src="/js/transition-planner/gantt-chart-d3.js"></script>
    <script type="text/javascript" src="/js/transition-planner/saveSvgAsPng.js"></script>
    <script type="text/javascript" src="/js/transition-planner/generateMtFPlan.js"></script>
    <script type="text/javascript" src="/js/transition-planner/modal-newMtFPlan.js"></script>
    <script type="text/javascript" src="/js/transition-planner/generateFtMPlan.js"></script>
    <script type="text/javascript" src="/js/transition-planner/modal-newFtMPlan.js"></script>
    <script type="text/javascript" src="/js/transition-planner/modal-editPlan.js"></script>
    
    <script type="text/javascript" src="/js/transition-planner/json-download.js"></script>
    <script type="text/javascript" src="/js/transition-planner/json-to-table.js"></script>
    <script type="text/javascript" src="/js/transition-planner/json-from-table.js"></script>
    <script type="text/javascript" src="/js/transition-planner/png-download.js"></script>
	<script type="text/javascript" src="/js/transition-planner/transition-planner.js"></script>

}!}
