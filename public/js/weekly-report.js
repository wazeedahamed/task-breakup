(function () {
    const onLoad = window.onload ? window.onload : null;
    let entries = [];
    let grouped = [];
    const template = document.querySelector(".reportTemplate").cloneNode(true);
    const sqlDate = (dt) => `${dt.getFullYear().toString()}-${(dt.getMonth() + 1).toString().padStart(2, "0")}-${dt.getDate().toString().padStart(2, "0")}`;
    window.onload = () => {
        onLoad?.call(null);
        setEvents();
        loadEntries();
    }

    function setEvents() {
        document.addEventListener('change', function () {
            const data = Array.from(document.querySelectorAll("#filter-form input, #filter-form select"))
                .reduce((acc, ele) => {
                    acc[ele.id] = ele.value.trim();
                    return acc;
                }, {});
            setDataList(false, data);
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
                entries.sort(({ date: a }, { date: b }) => a < b ? -1 : a > b ? 1 : 0);
                setDataList(true, null);
            }
        });
    }

    function updateDataList() {
        const dateList = [];
        if (entries.length > 0) {
            const fromDate = new Date(entries[0].date);
            const today = new Date(sqlDate(new Date()));
            const adjust = 1 - fromDate.getDay() - (fromDate.getDay() ? 0 : 7);
            fromDate.setDate(fromDate.getDate() + adjust);
            while (fromDate <= today) {
                dateList.push(sqlDate(fromDate));
                fromDate.setDate(fromDate.getDate() + 7);
            }
        }

        const option = (v) => {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = v;
            return o;
        }, appendOptions = (ele, opt) => {
            opt.forEach(v => ele.appendChild(option(v)));
        };

        document.querySelector("#fromdate").innerHTML = "";
        appendOptions(document.querySelector("#fromdate"), dateList.sort().reverse());
        document.querySelector("#fromdate").selectedIndex = 0;
    }

    function setDataList(init, data) {
        if (init) {
            updateDataList();
            grouped = entries.reduce((acc, entry) => {
                const groupKey = entry.date;
                const data = acc.hasOwnProperty(groupKey) ? acc[groupKey] : (acc[groupKey] = []);
                data.push(entry);
                return acc;
            }, {});
        }

        if (!data) {
            data = { fromdate: document.querySelector("#fromdate").value };
        }

        const fromDate = new Date(data.fromdate),
            year = fromDate.getFullYear(),
            month = fromDate.getMonth(),
            from = fromDate.getDate(),
            filterDates = [
                sqlDate(new Date(year, month, from)),
                sqlDate(new Date(year, month, from + 1)),
                sqlDate(new Date(year, month, from + 2)),
                sqlDate(new Date(year, month, from + 3)),
                sqlDate(new Date(year, month, from + 4)),
                sqlDate(new Date(year, month, from + 5)),
                sqlDate(new Date(year, month, from + 6))
            ],
            filteredData = [];

        filterDates.forEach(date => [].push.apply(filteredData, grouped[date] || []));

        const taskList = filteredData.reduce(({ data, keyIndex }, task) => {
            const key = task.fullTaskName;
            const _task = data[keyIndex.hasOwnProperty(key) ? keyIndex[key] : (keyIndex[key] = data.length)];
            if (_task) {
                _task.minutes += task.minutes;
                _task.minutesByDate.hasOwnProperty(task.date)
                    ? (_task.minutesByDate[task.date] += task.minutes)
                    : (_task.minutesByDate[task.date] = task.minutes);
            } else {
                data.push({
                    fullTaskName: task.fullTaskName,
                    minutes: task.minutes,
                    minutesByDate: {
                        [task.date]: task.minutes
                    }
                });
            }
            return { data, keyIndex };
        }, {
            data: [],
            keyIndex: {}
        }).data;

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
            };
        const totalTimes = filterDates.map(() => 0).concat(0);
        container.innerHTML = "";
        const t = template.cloneNode(true);
        t.querySelectorAll('.report-date').forEach((e, i) => {
            e.textContent = filterDates[i];
        });
        const tb = t.querySelector('tbody');
        const tf = t.querySelector('tfoot');
        container.appendChild(t);

        taskList.forEach((task, index) => {
            const tr = document.createElement('tr');
            tb.appendChild(tr);
            if (index % 2 == 1) {
                tr.classList.add('pure-table-odd');
            }

            td(tr, String(index + 1), true);
            td(tr, task.fullTaskName);
            const totalCls = td(tr, hhmmmins(task.minutes), true).classList;
            totalCls.add('no-wrap');
            totalCls.add('text-bold');
            totalTimes[7] += task.minutes;
            filterDates.forEach((date, dateIndex) => {
                const _spentTime = task.minutesByDate[date] || 0;
                td(tr, _spentTime ? hhmmmins(_spentTime) : "", true).classList.add('no-wrap');
                totalTimes[dateIndex] += _spentTime;
            });
        });

        const tr = document.createElement('tr');
        tf.appendChild(tr);

        td(tr);
        td(tr, "Total", true);
        td(tr, hhmmmins(totalTimes[7]), true).classList.add('no-wrap');
        filterDates.forEach((date, dateIndex) => {
            const cls = td(tr, hhmmmins(totalTimes[dateIndex]), true).classList;
            cls.add('no-wrap');
            cls.add(totalTimes[dateIndex] != 480 ? 'error' : 'okay');
        });
    }

    function hhmmmins(mins) {
        const hh = String(Math.floor(mins / 60)).padStart(2, "0"),
            mm = String(mins % 60).padStart(2, "0");
        return `${hh}.${mm}`;
    }

}());