const express = require('express');
const scrapeQueue = require('./queue');

const app = express();
const port = 3000;

app.use(express.json());

app.post('/visiturls', async (req, res) => {
    const { urls , tests , extractData} = req.body;

    console.log(urls);
    try {
        const job = await scrapeQueue.add('scrape', { urls , tests });
        console.log(job)
        res.status(200).json({ message: 'Job added successfully', jobId: job.id });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while adding the job.');
    }
});

app.get('/visiturls/jobs', async (req, res) => {
    const jobId = req.query.id; // Get the job ID from query parameters
    const job = await scrapeQueue.getJob(jobId);
    if (job) {
        const state = await job.getState();
        const result = job.returnvalue;
        const progress = await job.progress();
        res.json({ state,progress,result });
    } else {
        res.status(404).json({ error: 'Job not found' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
