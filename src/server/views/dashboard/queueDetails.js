const _ = require('lodash');
const Queues = require('../../bull');

const metrics = [
  'redis_version',
  'total_system_memory',
  'used_memory',
  'mem_fragmentation_ratio',
  'connected_clients',
  'blocked_clients'
];

async function handler(req, res) {
  const name = req.params.queueName;
  const queue = await Queues.get(name);
  if (!queue) return res.status(404).render('dashboard/templates/queueNotFound.hbs', {name});

  /*
    TODO(randall): get feedback on practicality of this idea
    Description: Get elapsed time for currently processing job

    const jobTypes = ['waiting', 'active', 'completed', 'failed', 'delayed'];
    const jobTimestamps = (await Promise.all(jobTypes.map((type) => queue[`get${_.capitalize(type)}`](0, 0))))
      .map((jobs) => _.first(jobs) || {})
      .map((job) => job['timestamp']);
    const jobTimestampsMap = {};
    for (let typeIndex of _.range(jobTypes.length)) {
      jobTimestampsMap[jobTypes[typeIndex]] = jobTimestamps[typeIndex];
    }
  */

  const jobCounts = {
    failed: await queue.getFailedCount(),
    delayed: await queue.getDelayedCount(),
    paused: await queue.getActiveCount(),
    waiting: await queue.getWaitingCount(),
    active: await queue.getActiveCount(),
    completed: await queue.getCompletedCount()
  };
  const stats = await getStats(queue);

  return res.render('dashboard/templates/queueDetails.hbs', {
    name,
    jobCounts,
    stats
  });
}

async function getStats(queue) {
  const info = await queue.client.info();

  return _.pickBy(queue.client.server_info, (value, key) => _.includes(metrics, key));
}

module.exports = handler;
