const express = require('express');
const master = require('./master/master');
const { getEntries, handleEntryRequest } = require("./action/entryHandler");
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'pug');

app.get('/', async (req, res) => {
    res.render('index', { ...master.data, ...(await getEntries()) });
});

app.post('/entry', async (req, res) => {
    const [entry, action] = req.body,
        result = await handleEntryRequest(entry, action);
    res.send(result);
});

app.get('/report', async (req, res) => {
    res.render('report');
});

app.post('/entries', async (req, res) => {
    const { action } = req.body,
        result = await handleEntryRequest(null, action);
    res.send(result);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});