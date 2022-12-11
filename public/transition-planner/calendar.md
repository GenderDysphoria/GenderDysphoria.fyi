---
date: "2022-12-11T10:02:55.000Z"
title: "Transition Planning Calendar"
linkTitle: "Transition Planner"
description: "Anxiety makes some people procrastinate; it makes others over-plan."
---

## Generate Plan

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
                            <img class="w-l5" src="/transition-planner/images/mtf.png" />
                            <h4 class="indigo fw-600 fs-m3 mb-5">Generate New <span class="blue">Male</span> to <span class="red">Female</span> Transition Plan</h4> 
                                 
                                  <!-- Trigger/Open The New MtF Modal -->
                                
                                    <div id="mtfModal" class="mtf-modal fw-600 opacity-100">
                                        <div id="mtfQuestions" class="mtf-modal-content">
                                        </div>
                                        </div>
                                        <button id="newMtFModalButton" class="button">Generate New MtF Plan</button>
                            
                                
                        </div>
                    </div>
                    <div id="ftmDiv"  class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5" src="/transition-planner/images/ftm.png" />
                            <h4 class="indigo fw-600 fs-m3 mb-5">Generate New <span class="red">Female</span> to <span class="blue">Male</span> Transition Plan</h4> 
                            
                                <!-- Trigger/Open The New FtM Modal -->
                                <div id="ftmModal" class="ftm-modal fw-600 opacity-100">
                                    <div id="ftmQuestions" class="ftm-modal-content">
                                    </div>
                                    </div>
                                    <button id="newFtMModalButton" class="button">Generate New FtM Plan</button>
                                
                        </div>
                    </div>
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5" src="/transition-planner/images/indigo upload.png" />
                            <h4 class="indigo fw-600 fs-m3 mb-5">Upload Existing Transition Plan</h4> 
                             
                            <label for="file" class="button">
                                Upload Existing Plan
                            </label>
                            <input id="file" type="file" />
                            
                        </div>
                    </div>
                </div>
            </section>

    <section id="editAndDownload" class="p-10 md-p-l5" style="display: none;">
                <div class="flex flex-column md-flex-row mx-auto">
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <h4 class="white fw-600 fs-m3 mb-5"></h4>
                            <img class="w-l5" src="/transition-planner/images/edit calendar.png" />
                            <div class="indigo-lightest fw-600 fs-m1 lh-3 opacity-50">Edit Plan</div>
                            <!-- Trigger/Open The Edit Plan Modal -->
                                <button id="editPlanModalButton"  class="button">Edit Transition Plan</button>
                                <div id="editPlanModal" class="edit-plan-modal">
                                    <div class="edit-plan-modal-content">
                                    <p>Make any plan changes, be sure to save your plan after!</p>
                                    <button id="closeEditsNoSave"  class="button">Close Without Saving</button>
                                    <button id="finalizePlanEdits"  class="button">Save Plan Changes</button>
                                    <div id="planEditTable"></div>
                                    </div>
                                </div>
                        </div>
                    </div>
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5" src="/transition-planner/images/indigo file download.png" />
                            <div class="indigo-lightest fw-600 fs-m1 lh-3 opacity-50">Download Plan</div>

                                <button  class="button" onclick="downloadJSONFile()">Download My Plan</button>
                                <a id="downloadAnchorElem" style="display: none;"></a>
                        </div>
                    </div>
                    <div class="w-100pc md-w-40pc">
                        <div class="br-8 p-5 m-5">
                            <img class="w-l5" src="/transition-planner/images/indigo image download.png" />
                            <div class="indigo-lightest fw-600 fs-m1 lh-3 opacity-50">Download Image</div>
        
                                <button  class="button" id="downloadPng">Download Image</button>
                        </div>
                    </div>
                </div>
            </section>

             <div class="white fw-600 fs-m3 mb-5" style="display: none;" id="zoomControl">
    
                <h1 class="white fs-l3 lh-2 md-fs-xl1 md-lh-1 fw-900 ">TranzPlan:</h1>
                Start Date: <input type="date" id="graphStartDate"></input><br>
                End Date: <input type="date" id="graphEndDate"></input><br>
                <button  class="button" id="setGraphStartEnd" onclick="renderGanttChart()">Zoom</button>
            </div>

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
