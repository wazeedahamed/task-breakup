(function () {
    const onLoad = window.onload ? window.onload : null;
    window.onload = () => {
        onLoad?.call(null);
        setEvents();
    }

    function setEvents() {
        document.addEventListener('click', (e) => {
            const target = e.target,
                classes = target.classList;

            if (classes.contains("save-entry")) {
                e.preventDefault();
                addEntry();
            }
            if (classes.contains("edit-entry")) {
                e.preventDefault();
                editEntry(target.getAttribute('data-unid'));
            }
            if (classes.contains("copy-entry")) {
                e.preventDefault();
                copyEntry(target.getAttribute('data-unid'));
            }
            if (classes.contains("delete-entry")) {
                e.preventDefault();
                deleteEntry(target.getAttribute('data-unid'));
            }
        });

        // Form Events
        const form = document.querySelector("#entry-form");
        const allowPasteIDs = ['currenttask', 'comments'];
        form.addEventListener('paste', (e) => {
            if (allowPasteIDs.indexOf((e.target.id || '').toLowerCase()) == -1) {
                e.preventDefault();
            }
        });
        form.addEventListener('keypress', (e) => {
            const target = e.target;
            if (target.classList.contains('time') && !isFinite(+e.key)) {
                e.preventDefault();
            }
        });
        form.addEventListener('change', (e) => {
            const target = e.target;
            if (target.classList.contains('time')) {
                let newValue = target.value.replace(/[ :]+/g, "").trim().substring(0, 4);
                if (isFinite(+newValue) && newValue !== "") {
                    if (newValue > "2400") {
                        newValue = "2400";
                    }
                    newValue = `${newValue.substring(0, 2).padStart(2, "0")}:${newValue.substring(2, 4).padStart(2, "0")}`;
                } else {
                    newValue = "";
                }
                target.value = newValue;
            }
        });
    }

    function entryAction(entry, action) {
        return fetch("/entry", {
            method: "POST",
            body: JSON.stringify([entry, action]),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async function fetchHandler(d) {
        let data = { success: true, message: null, reload: true, data: null }
        if (d.ok) {
            const d2 = await d.json();
            data = { ...data, ...d2 };
        } else {
            data.success = false;
            data.message = d.statusText;
        }
        return handleError(data);
    }

    function handleError({ success, message, reload, data }) {
        if (success) {
            if (reload) {
                window.location.reload();
            } else {
                return data;
            }
        } else {
            if (reload) {
                message && alert(message);
                window.location.reload();
            } else {
                message && (document.querySelector('#error').innerHTML = message);
            }
        }
        return null;
    }

    function addEntry() {
        const today = new Date();
        const data = Array.from(document.querySelectorAll("#entry-form input:not([type=button])"))
            .reduce((acc, ele) => (acc[ele.id] = ele.value.trim(), acc), {}),
            [sh, sm] = data.start.split(":").map(Number),
            [eh, em] = data.end.split(":").map(Number);
        data.minutes = ((eh - sh) * 60) + em - sm;
        data.date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const error = (!data.task && "Task is invalid") ||
            (!isFinite(data.minutes) && "Start time or End time is invalid") ||
            (data.minutes < 0 && "Start time cannot be after End time") ||
            (data.minutes == 0 && "Start time cannot be same as End time");

        if (error) {
            document.querySelector('#error').innerHTML = error;
        } else {
            entryAction(data, "add")
                .then(fetchHandler)
                .then(d => {
                    d && window.location.reload();
                });
        }
    }

    function editEntry(unid) {
        entryAction({ unid }, "edit")
            .then(fetchHandler)
            .then(d => {
                if (!d) return;
                const form = document.querySelector("#entry-form");
                [
                    "unid",
                    "task", "subtask", "currenttask",
                    "start", "end",
                    "comments"
                ].forEach(id => {
                    form.querySelector(`#${id}`).value = d[id];
                });
            });
    }

    function copyEntry(unid) {
        entryAction({ unid }, "edit")
            .then(fetchHandler)
            .then(d => {
                if (!d) return;
                const form = document.querySelector("#entry-form");
                [
                    "task", "subtask", "currenttask",
                    "comments"
                ].forEach(id => {
                    form.querySelector(`#${id}`).value = d[id];
                });
                [
                    "unid",
                    "start", "end"
                ].forEach(id => {
                    form.querySelector(`#${id}`).value = "";
                });
            });
    }

    function deleteEntry(unid) {
        entryAction({ unid }, "delete")
            .then(fetchHandler)
            .then(d => {
                d && window.location.reload();
            });
    }

}());