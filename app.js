const statusColumns = document.querySelectorAll(".project-tasks .project-column");
const taskDetailsEl = document.querySelector('.task-progress');
const mainTitle = document.querySelector(".project-info h1");
const columnTitleReady = document.querySelector("#ready h2");
const columnTitleInProgress = document.querySelector("#progress h2");
const columnTitleReview = document.querySelector("#review h2");
const columnTitleDone = document.querySelector("#done h2");
//const taskProgressTitle = document.querySelector(".task-details h2");
const loadingEl = document.querySelector(".loading");
const taskDetails = document.querySelector(".task-details");
// const loadingText = document.querySelector(".loading p");
// let dotCount = 0;
// setInterval(() => {
//     dotCount = (dotCount + 1) % 4;
//     loadingText.textContent = 'Loading' + ".".repeat(dotCount)
// }, 500)
//mainTitle.innerText = "Homepage Design";

// Fetch to get tasks
let allTasks = [];
let promise = fetch("http://wiendekoration-004-site1.etempurl.com/api/tasks?token=T0TI2")
    .then(res => res.json()).then(tasks => {
        console.log(tasks);
        allTasks = tasks;
        loadingEl.style.display = "none";
        taskDetails.style.display = "inline-block";
        mainTitle.innerText = "Homepage Design";
        columnTitleReady.innerText = "Task Ready";
        columnTitleInProgress.innerText = "In Progress";
        columnTitleReview.innerText = "Needs Review";
        columnTitleDone.innerText = "Done";
        //taskProgressTitle.innerText = "Task Progress by Department";
        //Use reduce to grouped tasks by statusId
        const groupedtTasksStatus = groupTasksByStatus(tasks);
        //for loop to create task item and add it to the appropriate project column depending on statusId
        distributeTasksToStatusColumns(groupedtTasksStatus);
        //Use reduce to grouped tasks by departmentId and if the task is done or not
        const groupedtTasksDept = groupTasksByDeptAndDoneTask(tasks);
        console.log(groupedtTasksDept);

        // function to create task progress item and modify progress value and max
        createProgressAndModifyItsValues(groupedtTasksDept);

        let tasksEl = document.querySelectorAll(".task");
        let draggedItem = null;
        tasksEl.forEach((taskEl) => {
            taskEl.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", e.target.dataset.id);
                draggedItem = taskEl;
            })
        })

        statusColumns.forEach(column => {
            column.addEventListener("dragover", e => {
                if (draggedItem && draggedItem.parentElement !== column)
                    e.preventDefault();
            })
            column.addEventListener("drop", (e) => {
                const taskId = e.dataTransfer.getData("text/plain");
                const newStatus = getIdOfStatusByName(column.dataset.status);
                const TaskElement = document.querySelector(`.task[data-id="${taskId}"]`);
                console.log("new status : " + newStatus);
                console.log("task el : " + TaskElement);
                if (TaskElement) {
                    column.appendChild(TaskElement);
                    fetch(`http://wiendekoration-004-site1.etempurl.com/api/ModifyTask?token=T0TI2&id=${taskId}&statusId=${newStatus}`)
                        .then(res => {
                            if (!res.ok) throw new Error("An error occurred while updating");
                            return res.json();
                        }).then(data => {
                            const updatedTaskIndex = allTasks.findIndex(task => task.id == taskId);
                            if (updatedTaskIndex !== -1) {
                                allTasks[updatedTaskIndex].statusId = newStatus;
                            }
                            console.log("The update succeeded");
                            console.log("data : " + data);

                            // if (newStatus == 4) {
                            taskDetailsEl.innerHTML = "";


                            createProgressAndModifyItsValues(groupTasksByDeptAndDoneTask(allTasks));

                            // }
                        }).catch(err => {
                            console.error("Update failed", err)
                        })
                }
            })
        })

    }).catch(() => {
        console.log("Error here !");

    })









// function to group tasks by statusId using reduce
function groupTasksByStatus(tasks) {
    const grouptasksStatus = tasks.reduce((tasksStatus, currentTask) => {
        const status = currentTask.statusId;
        if (!tasksStatus[status]) {
            tasksStatus[status] = [];
        }
        tasksStatus[status].push(currentTask);
        return tasksStatus
    }, {});
    return grouptasksStatus;
}
//function to create task item and add it to the appropriate project column depending on statusId
function distributeTasksToStatusColumns(groupedtTasksStatus) {

    for (const status in groupedtTasksStatus) {
        const groupedStatusFragment = new DocumentFragment();
        groupedtTasksStatus[status].forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.setAttribute('draggable', "true");
            taskEl.dataset.id = task.id;
            const departmentElement = document.createElement('span');
            const titleElement = document.createElement('p');
            taskEl.classList.add('task');
            titleElement.classList.add("title-task");
            departmentElement.classList.add("task-tag");
            departmentElement.innerText = getDepartmentNameAndAddClasses(task.departmentId, departmentElement, null, null);
            titleElement.innerText = task.title;
            taskEl.appendChild(departmentElement);
            taskEl.appendChild(titleElement);

            groupedStatusFragment.appendChild(taskEl);
        });
        statusColumns[status - 1].appendChild(groupedStatusFragment);
    }

}

//Use reduce to grouped tasks by departmentId and if the task is done or not
function groupTasksByDeptAndDoneTask(tasks) {
    const groupTasksByDept = tasks.reduce((tasksDept, currentTask) => {
        const dept = currentTask.departmentId;
        if (!tasksDept[dept]) {
            tasksDept[dept] = { done: [], notDone: [] };
        }
        if (currentTask.statusId == 4)
            tasksDept[dept].done.push(currentTask);
        else
            tasksDept[dept].notDone.push(currentTask);
        return tasksDept
    }, {});
    return groupTasksByDept;
}
// function to create task progress item and modify progress value and max
function createProgressAndModifyItsValues(groupedtTasksDept) {
    const groupedDeptFragment = new DocumentFragment();
    const taskProgressTitle = document.createElement('h2');
    taskProgressTitle.innerText = "Task Progress by Department";
    groupedDeptFragment.appendChild(taskProgressTitle);
    for (const dept in groupedtTasksDept) {

        const taskProgressItem = document.createElement('div');
        const taskProgressName = document.createElement('p');
        const taskRate = document.createElement("span");
        const taskProgress = document.createElement("progress");
        taskProgressName.innerText = getDepartmentNameAndAddClasses(Number(dept), null, taskProgress, taskProgressItem);
        taskRate.innerText = `${groupedtTasksDept[dept].done.length} / ${groupedtTasksDept[dept].done.length + groupedtTasksDept[dept].notDone.length}`;
        taskProgressName.appendChild(taskRate);
        taskProgress.max = groupedtTasksDept[dept].done.length + groupedtTasksDept[dept].notDone.length;
        taskProgress.value = groupedtTasksDept[dept].done.length;
        taskProgressItem.classList.add("task-progress-item");
        taskProgress.classList.add("progress");
        taskProgressItem.appendChild(taskProgressName);
        taskProgressItem.appendChild(taskProgress);

        groupedDeptFragment.appendChild(taskProgressItem);
    }
    //taskDetailsEl.appendChild(columnTitleInProgress);
    taskDetailsEl.appendChild(groupedDeptFragment);

}
//function to get department name using department id , counted tasks
function getDepartmentNameAndAddClasses(departmentId, departmentElement, progressElement, taskProgressItem) {
    switch (departmentId) {
        case 1:
            if (departmentElement)
                departmentElement.classList.add("task-tag--ui-ux");
            if (progressElement)
                progressElement.classList.add("progress--ui-ux");
            if (taskProgressItem)
                taskProgressItem.classList.add("ui-ux")
            return "UI/UX";
        case 2:
            if (departmentElement)
                departmentElement.classList.add("task-tag--frontend");
            if (progressElement)
                progressElement.classList.add("progress--frontend");
            if (taskProgressItem)
                taskProgressItem.classList.add("frontend")
            return "Frontend";
        case 3:
            if (departmentElement)
                departmentElement.classList.add("task-tag--aspcore");
            if (progressElement)
                progressElement.classList.add("progress--aspcore");
            if (taskProgressItem)
                taskProgressItem.classList.add("aspcore")
            return "ASP Core";

        case 4:
            if (departmentElement)
                departmentElement.classList.add("task-tag--sqlserver");
            if (progressElement)
                progressElement.classList.add("progress--sqlserver");
            if (taskProgressItem)
                taskProgressItem.classList.add("sqlserver");
            return "SQL Server";
        default:
            return "welcome";
    }
}
function getIdOfStatusByName(statusName) {
    switch (statusName) {
        case "ready":
            return 1;
        case "progress":
            return 2;
        case "review":
            return 3;
        case "done":
            return 4;

    }
}
// function assignCLassToProgressByDept(departmentId, progressElement) {
//     switch (departmentId) {
//         case 1:
//             progressElement.classList.add("progress--ui-ux");
//             return "UI/UX";
//         case 2:
//             progressElement.classList.add("progress--frontend");
//             return "Frontend";
//         case 3:
//             progressElement.classList.add("progress--aspcore");
//             return "ASP Core";
//         case 4:
//             progressElement.classList.add("progress--sqlserver");
//             return "SQL Server";
//         default:
//             return "welcome";
//     }
// }
