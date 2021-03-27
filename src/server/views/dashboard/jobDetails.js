const _ = require('lodash');
const util = require('util');

async function handler(req, res) {
  const { queueName, queueHost, id } = req.params;
  const { json } = req.query;
  const basePath = req.baseUrl;

  const { Queues } = req.app.locals;
  const queue = await Queues.get(queueName, queueHost);
  if (!queue)
    return res
      .status(404)
      .render('dashboard/templates/queueNotFound', { basePath, queueName, queueHost });

  const job = await queue.getJob(id);
  if (!job)
    return res
      .status(404)
      .render('dashboard/templates/jobNotFound', { basePath, id, queueName, queueHost });

  const logs = await queue.getJobLogs(job.id);
  job.logs = logs.logs || 'No Logs';

  if (json === 'true') {
    // Omit these private and non-stringifyable properties to avoid circular
    // references parsing errors.
    return res.json(_.omit(job, 'domain', 'queue', '_events', '_eventsCount'));
  }

  let jobState = 'unknown'
  if (_.isInteger(job.finishedOn) && !job.failedReason) jobState = 'completed'
  else if (_.isInteger(job.processedOn) && !job.finishedOn) jobState = 'active'
  else if ((job.delay || 0) > 0 && !job.processedOn) jobState = 'delayed'
  else if (!job.processedOn && !job.delay) jobState = 'waiting'
  else if (_.isInteger(job.finishedOn) && _.isString(job.failedReason)) jobState = 'failed'

  const failed = queue.IS_BEE ? job.status === 'failed' : job.failedReason
  job.showRetryButton = !queue.IS_BEE || failed;
  job.retryButtonText = failed ? 'Retry' : 'Trigger';
  const stacktraces = queue.IS_BEE ? job.options.stacktraces : job.stacktrace;

  if (!queue.IS_BEE) {
    const logs = await queue.getJobLogs(job.id);
    job.logs = logs.logs || 'No Logs';
  }

  return res.render('dashboard/templates/jobDetails', {
    basePath,
    queueName,
    queueHost,
    jobState,
    job,
    stacktraces,
  });
}

module.exports = handler;
