(function () {
    const onLoad = window.onload ? window.onload : null;
    let entries = [];
    const template = document.querySelector(".reportTemplate").cloneNode(true);
    window.onload = () => {
        document.querySelector(".reportTemplate").remove();

        onLoad?.call(null);
        setEvents();
        loadEntries();
    }

    function setEvents() {
        document.addEventListener('change', function () {
            const data = Array.from(document.querySelectorAll("#filter-form input"))
                .reduce((acc, ele) => {
                    acc[ele.id] = ele.value.trim();
                    return acc;
                }, {});
            setDataList(data);
        });
    }

    function loadEntries() {
        fetch("/entries", {
            method: "POST",
            body: JSON.stringify({ action: "get_all" }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(async (d) => {
            if (d.ok) {
                entries = [...(await d.json())];
                setDataList({});
            }
        });
    }

    function updateDataList(_entries) {
        const list = _entries.reduce((acc, entry) => {
            if (!acc.task.includes(entry.task)) {
                acc.task.push(entry.task);
            }
            if (!acc.subtask.includes(entry.subtask)) {
                acc.subtask.push(entry.subtask);
            }
            if (!acc.date.includes(entry.date)) {
                acc.date.push(entry.date);
            }
            return acc;
        }, {
            task: [],
            subtask: [],
            date: []
        });

        const option = (v) => {
            const o = document.createElement('option');
            o.value = v;
            return o;
        }, appendOptions = (ele, opt) => {
            opt.forEach(v => ele.appendChild(option(v)));
        };

        document.querySelector("#tasklist").innerHTML = "";
        appendOptions(document.querySelector("#tasklist"), list.task.sort());
        document.querySelector("#subtasklist").innerHTML = "";
        appendOptions(document.querySelector("#subtasklist"), list.subtask.sort());
        document.querySelector("#datelist").innerHTML = "";
        appendOptions(document.querySelector("#datelist"), list.date.sort().reverse());

    }

    function setDataList(data) {

        const filtered = entries.filter(entry => {
            return (
                (data.task ? data.task == entry.task : true) &&
                (data.subtask ? data.subtask == entry.subtask : true) &&
                (data.fromdate ? data.fromdate <= entry.date : true) &&
                (data.todate ? data.todate >= entry.date : true)
            );
        }).sort(({ date: a }, { date: b }) => a < b ? -1 : a > b ? 1 : 0), byTask = document.querySelector("#bytask").checked;

        updateDataList(filtered);

        const grouped = filtered.reduce((acc, entry) => {
            const groupKey = byTask ? entry.fullTaskName : entry.date;
            const data = acc.hasOwnProperty(groupKey) ? acc[groupKey] : (acc[groupKey] = []);
            data.push(entry);
            return acc;
        }, {});

        Object.keys(grouped).forEach(date => {
            grouped[date] = grouped[date].reduce(({ data, keyIndex }, entry) => {
                const key = `${entry.fullTaskName}${entry.comments}`;
                let _entry = data[keyIndex.hasOwnProperty(key) ? keyIndex[key] : (keyIndex[key] = data.length)];
                if (_entry) {
                    _entry.minutes += entry.minutes;
                    _entry.title.push(`[${entry.start12hr} to ${entry.end12hr}]`.replace(/ /g, "_"));
                } else {
                    data.push({ ...entry, title: [`[${entry.start12hr} to ${entry.end12hr}]`.replace(/ /g, "_")] });
                }
                return { data, keyIndex }
            }, {
                data: [],
                keyIndex: {}
            }).data;
        });

        console.log(grouped);

        const container = document.querySelector("#container"),
            td = (tr, text, right) => {
                const ele = document.createElement('td');
                tr.appendChild(ele);
                const span = document.createElement('span');
                ele.appendChild(span);
                span.textContent = text;
                if (right) {
                    ele.classList.add('text-right');
                }
                return ele;
            },
            tooltip = (ele, title) => {
                ele.setAttribute('data-title', title);
                ele.classList.add('tooltip');
                ele.classList.add('animationTips');
            };
        let filteredTime = 0;
        container.innerHTML = "";

        Object.keys(grouped)
            .forEach(date => {
                const t = template.cloneNode(true);
                const tb = t.querySelector('tbody');
                let time = 0;
                container.appendChild(t);
                grouped[date].forEach((entry, index) => {
                    const tr = document.createElement('tr'),
                        title = entry.title.join("\n");
                    tb.appendChild(tr);
                    // tr.title = entry.title.join("\n");
                    if (index % 2 == 1) {
                        tr.classList.add('pure-table-odd');
                    }

                    td(tr, String(index + 1), true);
                    tooltip(td(tr, entry.fullTaskName).querySelector('span'), title);
                    td(tr, entry.comments);
                    td(tr, hhmmmins(entry.minutes), true).classList.add('no-wrap');
                    time += entry.minutes;
                });

                t.querySelector(".dateInput").textContent = `${date} [ Time: ${hhmmmins(time)} ]`;
                filteredTime += time;
            });
        document.querySelector('#filteredTime').textContent = `[ Time: ${hhmmmins(filteredTime)} ]`;
    }

    function hhmmmins(mins) {
        const hh = String(Math.floor(mins / 60)).padStart(2, "0"),
            mm = String(mins % 60).padStart(2, "0");
        return `${hh}:${mm} (${mins} mins)`;
    }

}());