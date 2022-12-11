---
date: "2020-01-26T20:41:55.827Z"
title: "How Gender Dysphoria Manifests: Societal Dysphoria"
linkTitle: "Societal Dysphoria"
description: "Because a Role is a Role, and a Toll is a Toll, and it's a heavy toll to live the wrong role."
---

{!{ 
    
    <!-- This is pretty hacky, I just copy/pasted a pre-built webpage into everything else  -->
     <link type="text/css" href="http://mbostock.github.io/d3/style.css" rel="stylesheet" />
<link type="text/css" href="/css/transition-planner.css" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/shorthandcss@1.1.1/dist/shorthand.min.css" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Muli:200,300,400,500,600,700,800,900&display=swap" />
<link rel="stylesheet" type="text/css"
    href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.9.0/slick.min.css" />
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css" /> 


     <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet">
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
	 <script src="https://d3js.org/d3.v3.js"></script>

    <nav class="w-100pc flex flex-column md-flex-row md-px-10 py-5 bg-black">
        <div class="flex justify-between">
            <a href="#" class="flex items-center p-2 mr-4 no-underline" onclick="location.reload();">
                <img class="max-h-l2 w-auto" src="/transition-planner/images/transgender-icon.png" />
            </a>
            <a data-toggle="toggle-nav" data-target="#nav-items" href="#"
                class="flex items-center ml-auto md-hidden indigo-lighter opacity-50 hover-opacity-100 ease-300 p-1 m-3">
                <i data-feather="menu"></i>
            </a>
        </div>
        <div id="nav-items" class="hidden flex sm-w-100pc flex-column md-flex md-flex-row md-justify-end items-center">
            <a href="#home" class="fs-s1 mx-3 py-3 indigo no-underline hover-underline">Home</a>
            <a href="#disclaimer" class="fs-s1 mx-3 py-3 indigo no-underline hover-underline">Disclaimer</a>
        </div>
    </nav>
   
      <!-- hero section -->
<section id="disclaimer" class="flex justify-start items-center">
    <div class="mx-5 md-mx-l5">
        <div>
            <h1 class="white fs-l3 lh-2 md-fs-xl1 md-lh-1 fw-900 ">Tranz <br />Planz</h1>
        </div>
    </div>
</section>

            <!-- Generate a Plan -->
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

             <!-- hero section -->
<section id="disclaimer" class="min-h-100h flex justify-start items-center">
    <div class="mx-5 md-mx-l5">
        <div>
            <h1 class="white fs-l3 lh-2 md-fs-xl1 md-lh-1 fw-900 ">Disclaimer</h1>

            <div class="white fs-s3 mt-3">
                <div>
                    <p>
                        I'M NOT A DOCTOR. Talk to an actual medical professional for transition advice, this tool is only meant to help organize 
                        the massive number of things that need to happen in order to start transitioning.

                        <br>
                        Medical Timeline source information is <a href="https://www.gendergp.com/hrt-timelines-hormones-effects/">here</a>. A lot of the language used by medical professionals is pathologizing and negative, so I added the more positive terms and community-reported transition effects from the <a href="https://genderdysphoria.fyi/">Dysphoria Bible</a>.

                        <br> This site stores no personal information (which is why you should download the transition plan once you're done and re-upload if you wish to edit/review later).
                            Use this planning tool at your own risk, please don't sue me.
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
</section>

<section id="disclaimer" class="min-h-100h flex justify-start items-center">
    <div class="mx-5 md-mx-l5">
        <div>
            <h1 class="white fs-l3 lh-2 md-fs-xl1 md-lh-1 fw-900 ">Support Us</h1>

            <div class="white fs-s3 mt-3">
                <div>
                    <p>
                        Like the tool? Support us on <a href="https://www.patreon.com/tranzplanz">Patreon</a>. I really dislike ads, I'd like to keep this site ad-free if Patreon pays enough to keep it running.
                        <br> Creative Commons Attribution (CC BY) license, CottBot, LLC

                        <br>
                        Questions? Comments? Something I missed? Hit me up at: 
                        <br> tranzplanz@gmail.com
                
                    </p>
                </div>
            </div>
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
            


 

	<script type="text/javascript" src="/js/transition-planner.js"></script>
    <script type="text/javascript" src="/js/plan-obj-mtf.js"></script>
    <script type="text/javascript" src="/js/plan-obj-ftm.js"></script>
    <script type="text/javascript" src="/js/json-upload.js"></script>
    <script type="text/javascript" src="/js/gantt-chart-d3.js"></script>
    <script type="text/javascript" src="/js/saveSvgAsPng.js"></script>
    <script type="text/javascript" src="/js/generateMtFPlan.js"></script>
    <script type="text/javascript" src="/js/modal-newMtFPlan.js"></script>
    <script type="text/javascript" src="/js/generateFtMPlan.js"></script>
    <script type="text/javascript" src="/js/modal-newFtMPlan.js"></script>
    <script type="text/javascript" src="/js/modal-editPlan.js"></script>
    
    <script type="text/javascript" src="/js/json-download.js"></script>
    <script type="text/javascript" src="/js/json-to-table.js"></script>
    <script type="text/javascript" src="/js/json-from-table.js"></script>
    <script type="text/javascript" src="/js/png-download.js"></script>
    

}!}