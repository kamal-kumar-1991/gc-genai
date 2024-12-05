require('dotenv').config();
const amqp = require('amqplib');

const exchangeName = 'enterprise_data';
const queueName = "enterprise_data_loading"

let conObject  = {
    protocol: 'amqp',
    hostname: process.env.RABBIT_HOST,
    port: process.env.RABBIT_PORT,
    username: process.env.RABBIT_USERNAME,
    password: process.env.RABBIT_PASSWORD,
    locale: 'en_US',
    frameMax: 0,
    heartbeat: 5,
    vhost: `/${process.env.RABBIT_VHOST}`,
}
 
 
const publishMessage = async (message) => {
    let publishMessage = JSON.stringify(message);
    try {
        // Connect to RabbitMQ server
        const connection = await amqp.connect(conObject);

        // Create a channel
        const channel = await connection.createChannel();

        // Declare a exchange
        await channel.assertExchange(exchangeName, 'fanout', { durable: true });

        // Publish the message to the exchange
        channel.publish(exchangeName, queueName, Buffer.from(publishMessage), {persistent:true});      
        setTimeout(() => {
            connection.close();
        }, 500);
    } catch (error) {
        console.error('Error:: publishMessage: ', error);
    }
}
 
module.exports = { publishMessage };