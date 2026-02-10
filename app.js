// DOM Elements Selection
//  DOM تحديد العناصر من ال
const statusColumns = document.querySelectorAll(
  ".project-tasks .project-column",
);
const taskDetailsEl = document.querySelector(".task-progress");
const mainTitle = document.querySelector(".project-info h1");
const columnTitleReady = document.querySelector("#ready h2");
const columnTitleInProgress = document.querySelector("#progress h2");
const columnTitleReview = document.querySelector("#review h2");
const columnTitleDone = document.querySelector("#done h2");
const loadingEl = document.querySelector(".loading");
const taskDetails = document.querySelector(".task-details");

let allTasks = [];
let draggedItem = null;

// Initial Fetch: Load data from server
//  لجلب البيانات  fetch  استخدام
fetch("https://6981cb9cc9a606f5d4480e30.mockapi.io/tasks")
  .then((res) => res.json())
  .then((tasks) => {
    allTasks = tasks;
    // UI Setup
    // إعداد واجهة المستخدم
    loadingEl.style.display = "none";
    taskDetails.style.display = "inline-block";
    mainTitle.innerText = "Homepage Design";
    columnTitleReady.innerText = "Task Ready";
    columnTitleInProgress.innerText = "In Progress";
    columnTitleReview.innerText = "Needs Review";
    columnTitleDone.innerText = "Done";

    // Distribute tasks to columns |  توزيع المهام على  الأعمدة
    const groupedtTasksStatus = groupTasksByStatus(allTasks);
    distributeTasksToStatusColumns(groupedtTasksStatus);

    // Render statistics section |    رسم قسم الإحصائيات
    updateProgressSection();

    // Initialize Drag & Drop zones|   تفعيل مناطق الإفلات
    setupDropZones();
  })
  .catch((err) => {
    console.error("Data loading error:", err);
    loadingEl.innerHTML = "<p>Could not load data. Please try again later.</p>";
  });
// Distributes tasks to their respective status columns
// دالة لتوزيع المهام وتفعيل السحب عليها
function distributeTasksToStatusColumns(groupedtTasksStatus) {
  //Clear columns first to avoid duplication | مسح الأعمدة أولاً لتجنب تكرار العناصر
  statusColumns.forEach((col) => {
    const heading = col.querySelector(".project-column-heading");
    col.innerHTML = "";
    if (heading) col.appendChild(heading);
  });

  for (const status in groupedtTasksStatus) {
    const groupedStatusFragment = new DocumentFragment();
    groupedtTasksStatus[status].forEach((task) => {
      const taskEl = createTaskCard(task);
      groupedStatusFragment.appendChild(taskEl);
    });

    const column = statusColumns[status - 1];
    if (column) column.appendChild(groupedStatusFragment);
  }
}

//Creates a task card element with drag events | دالة إنشاء بطاقة المهمة مع أحداث السحب
function createTaskCard(task) {
  const taskEl = document.createElement("div");
  taskEl.classList.add("task");
  taskEl.setAttribute("draggable", "true");
  taskEl.dataset.id = task.id;

  const departmentElement = document.createElement("span");
  departmentElement.classList.add("task-tag");
  departmentElement.innerText = getDepartmentNameAndAddClasses(
    task.departmentId,
    departmentElement,
    null,
    null,
  );

  const titleElement = document.createElement("p");
  titleElement.classList.add("title-task");
  titleElement.innerText = task.title;

  taskEl.appendChild(departmentElement);
  taskEl.appendChild(titleElement);

  // Drag Events for Task | أحداث السحب للمهمة
  taskEl.addEventListener("dragstart", (e) => {
    draggedItem = taskEl;
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      taskEl.style.opacity = "0.5";
    }, 0);
  });

  taskEl.addEventListener("dragend", (e) => {
    taskEl.style.opacity = "1";
    draggedItem = null;
  });

  return taskEl;
}
// function to  initialize Drag & Drop zones
function setupDropZones() {
  statusColumns.forEach((column) => {
    column.addEventListener("dragover", (e) => {
      e.preventDefault();
      column.classList.add("drag-over");
      const afterElement = getDragAfterElement(column, e.clientY);
      const taskElement = document.querySelector(
        ".task[style*='opacity: 0.5']",
      );

      if (taskElement) {
        if (afterElement == null) {
          column.appendChild(taskElement);
        } else {
          column.insertBefore(taskElement, afterElement);
        }
      }
    });

    column.addEventListener("dragleave", () => {
      column.classList.remove("drag-over");
    });

    column.addEventListener("drop", (e) => {
      e.preventDefault();
      column.classList.remove("drag-over");

      const taskId = e.dataTransfer.getData("text/plain");

      const taskElement = draggedItem;

      const newStatus = getIdOfStatusByName(column.dataset.status);

      if (taskId && taskElement) {
        const taskIndex = allTasks.findIndex((t) => t.id == taskId);

        if (taskIndex !== -1) {
          const oldStatus = allTasks[taskIndex].statusId;
          const originalColumn = taskElement.parentElement;

          allTasks[taskIndex].statusId = newStatus;

          updateProgressSection();

          updateTaskOnServer(
            taskId,
            newStatus,
            oldStatus,
            taskElement,
            originalColumn,
          );
        }
      }
    });
  });
}
// Helper function to find the element after the current drag position
// دالة مساعدة لتحديد العنصر الذي يجب الإفلات قبله بناءً على إحداثيات الماوس
function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".task:not([style*='opacity: 0.5'])"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element;
}
function updateTaskOnServer(
  taskId,
  newStatus,
  oldStatus,
  taskElement,
  originalColumn,
) {
  fetch(`https://6981cb9cc9a606f5d4480e30.mockapi.io/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statusId: newStatus }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Server update failed");
      showToast("Task updated successfully!", "success");
    })
    .catch((err) => {
      console.error(err);
      originalColumn.appendChild(taskElement);

      const taskIndex = allTasks.findIndex((t) => t.id == taskId);
      if (taskIndex !== -1) allTasks[taskIndex].statusId = oldStatus;

      updateProgressSection();
      showToast("Failed to sync with server. Reverting change...", "error");
    });
}
function updateProgressSection() {
  taskDetailsEl.innerHTML = "";
  const groupedtTasksDept = groupTasksByDeptAndDoneTask(allTasks);
  createProgressAndModifyItsValues(groupedtTasksDept);
}

// الدوال المساعدة ---
// Groups tasks based on their status ID
// دالة لتجميع المهام في مجموعات بناءً على رقم الحالة الخاص بها
function groupTasksByStatus(tasks) {
  return tasks.reduce((acc, task) => {
    const status = task.statusId;
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {});
}

//   Groups tasks by department and filters completed tasks for statistics
// دالة لتجميع المهام حسب القسم وتصنيفها إلى (مكتملة/غير مكتملة) لاستخدامها في الإحصائيات

function groupTasksByDeptAndDoneTask(tasks) {
  return tasks.reduce((acc, task) => {
    const dept = task.departmentId;
    if (!acc[dept]) acc[dept] = { done: [], notDone: [] };
    if (Number(task.statusId) === 4) acc[dept].done.push(task);
    else acc[dept].notDone.push(task);
    return acc;
  }, {});
}

// Creates progress bars and updates their values based on department data
// دالة لإنشاء أشرطة التقدم وتحديث قيمها بناءً على بيانات كل قسم

function createProgressAndModifyItsValues(groupedtTasksDept) {
  const groupedDeptFragment = new DocumentFragment();
  const title = document.createElement("h2");
  title.innerText = "Task Progress by Department";
  groupedDeptFragment.appendChild(title);

  for (const dept in groupedtTasksDept) {
    const item = document.createElement("div");
    item.classList.add("task-progress-item");

    const p = document.createElement("p");
    const span = document.createElement("span");
    const progress = document.createElement("progress");
    progress.classList.add("progress");

    p.innerText = getDepartmentNameAndAddClasses(
      Number(dept),
      null,
      progress,
      item,
    );
    span.innerText = ` ${groupedtTasksDept[dept].done.length} / ${groupedtTasksDept[dept].done.length + groupedtTasksDept[dept].notDone.length}`;

    progress.max =
      groupedtTasksDept[dept].done.length +
      groupedtTasksDept[dept].notDone.length;
    progress.value = groupedtTasksDept[dept].done.length;

    p.appendChild(span);
    item.appendChild(p);
    item.appendChild(progress);
    groupedDeptFragment.appendChild(item);
  }
  taskDetailsEl.appendChild(groupedDeptFragment);
}

// Maps department IDs to names and applies specific CSS classes for styling
// دالة لربط أرقام الأقسام بأسمائها وتطبيق فئات تنسيق CSS خاصة بكل قسم

function getDepartmentNameAndAddClasses(id, el, prog, item) {
  const names = { 1: "UI/UX", 2: "Frontend", 3: "ASP Core", 4: "SQL Server" };
  const tags = { 1: "ui-ux", 2: "frontend", 3: "aspcore", 4: "sqlserver" };

  const className = tags[id];
  if (el) el.classList.add(`task-tag--${className}`);
  if (prog) prog.classList.add(`progress--${className}`);
  if (item) item.classList.add(className);

  return names[id] || "Other";
}

// Maps status names to their corresponding ID numbers
// دالة لتحويل أسماء الحالات (نص) إلى الأرقام المقابلة لها في قاعدة البيانات

function getIdOfStatusByName(name) {
  const map = { ready: 1, progress: 2, review: 3, done: 4 };
  return map[name];
}

//   Displays a toast notification | دالة إظهار تنبيه للمستخدم

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.classList.add("toast", `toast--${type}`);
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--hide");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3000);
}
