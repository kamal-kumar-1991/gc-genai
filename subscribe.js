require('dotenv').config();
const amqp = require('amqplib');

const dialoges = require("./controllers/dialogeController");
const dbLoader = require("./loaders/dbLoader");
const fileLoader = require("./loaders/fileLoader");
const sitemapImporter = require('./importers/sitemap');

// const logger = log.getLogger('app');
const cluster = require('cluster');
const os = require('os');

let conObject = {
  protocol: 'amqp',
  hostname: process.env.RABBIT_HOST,
  port: process.env.RABBIT_PORT,
  username: process.env.RABBIT_USERNAME,
  password: process.env.RABBIT_PASSWORD,
  locale: 'en_US',
  frameMax: 0,
  heartbeat: 25,
  vhost: `/${process.env.RABBIT_VHOST}`,
}
const exchangeName = 'enterprise_data';
const default_queue = "enterprise_data_loading"
async function subscribeLoader() {
  try {
    // Connect to RabbitMQ server
    const connection = await amqp.connect(conObject); // Replace with your RabbitMQ server URL if not running locally

    // Create a channel
    const channel = await connection.createChannel();

    // Declare a exchange

    await channel.assertExchange(exchangeName, 'fanout', { durable: true });

    // Create a temporary queue with a random name
    const queue = await channel.assertQueue(default_queue, { exclusive: false });

    // Bind the queue to the exchange
    channel.bindQueue(queue.queue, exchangeName, '');

    // Consume messages from the queue
    //console.log(' [*] Waiting for messages. To exit, press CTRL+C');
    channel.consume(queue.queue, async (msg) => {
      if (msg.content) {
        let messageContent = JSON.parse(msg.content);
        console.log(messageContent);

        const task_id = messageContent.task_id;
        const taskInformation = await dialoges.fetchTaskInformation(task_id);
        if (taskInformation) {
          dialoges.updateTaskInformation(task_id, { "status": "processing" });
          const loading_type = taskInformation.type;
          const bot_id = taskInformation.botId;

          const botInformation = await dialoges.fetchBotDetails(bot_id);
          if (botInformation) {
            if (messageContent.operation == 'importer') {

              switch (loading_type) {
                case 'sitemap':
                  sitemapImporter.sitemapImporter(bot_id, db_details)
                  break;
                default:
                  break;
              }
            }
            if (messageContent.operation == 'loader') {
              switch (loading_type) {
                case 'db':
                  const db_details = taskInformation.db;
                  dbLoader.dbLoader(botInformation, db_details, task_id)
                  break;
                case 'file' : 
                  const file_details = taskInformation.file;
                  fileLoader.fileLoader(botInformation,file_details, task_id )
                  break;
                default:
                  break;
              }
            }
          }
        }


      }
    }, { noAck: false });

    connection.on("close", () => {
      setTimeout(() => subscribe(), 1000);
    });
    connection.on("error", () => {
      setTimeout(() => subscribe(), 1000);
    });
    channel.on("close", () => {
      setTimeout(() => subscribe(), 1000);
    });
    channel.on("error", () => {
      setTimeout(() => subscribe(), 1000);
    });

  } catch (error) {
    console.error('Error occurred:', error);
  }
}

let activeWorkers = 0;


if (cluster.isMaster && process.env.ENVIRONMENT && process.env.ENVIRONMENT.toLowerCase() == "production") {
  // Create a worker for each CPU
  const cCPUs = require('os').cpus().length;
  for (let i = 0; i < cCPUs; i++) {
    cluster.fork();
    activeWorkers++;
    // logger.info(`Total active workers: ${activeWorkers}`);
  }
  cluster.on('online', function (worker) { });
  cluster.on('exit', function (worker, code, signal) {

    if (code !== 0 && !worker.exitedAfterDisconnect) {
      // logger.info(`Worker ${worker.process.pid} crashed.\nStarting a new worker...`);
      activeWorkers--;
      //forks a new process if any process dies
      const nw = cluster.fork();
      activeWorkers++;
      // logger.info(`Worker ${nw.process.pid} will replace the crashed worker`);
      // logger.info(`Active workers after restart is :: ${activeWorkers}`);
    }

  });
} else {
  console.log(`Worker ${process.pid} started in standalone mode`);
  subscribeLoader();
}