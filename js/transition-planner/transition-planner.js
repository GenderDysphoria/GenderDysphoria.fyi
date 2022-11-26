//This global variable gets set by upload or new plan generation.
var ganttChartJSON;

var msInDay = 24*60*60*1000;

var todaysDate = new Date();
var threeYears = new Date(todaysDate.getTime()+(1080 * msInDay));
document.getElementById('graphStartDate').valueAsDate = todaysDate;
document.getElementById('graphEndDate').valueAsDate = threeYears;



function renderGanttChart() {
    

    var format = "%Y %B";

    var gantt = d3.gantt().taskTypes(ganttChartJSON.taskNames).taskStatus(ganttChartJSON.taskStatus)
    .tickFormat(format)
    .timeDomain(
        [document.getElementById('graphStartDate').valueAsDate, 
        document.getElementById('graphEndDate').valueAsDate]);
    gantt(ganttChartJSON.tasks);
}

function hideTopButtonsAndScrollDown() {
    window.scrollTo(0, document.body.scrollHeight);
}