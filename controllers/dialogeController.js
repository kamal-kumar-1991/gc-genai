
const botConnection = require("../dbConnections/botConnection")

const dialoges = {}

dialoges.fetchTaskInformation = async (task_id) => {
  return await botConnection.fetchTaskInformation(task_id);
}

dialoges.fetchBotDetails = async (bot_id) => {
    return await botConnection.fetchBotDetails(bot_id);
}

dialoges.updateTaskInformation = async (task_id, updateInformation) => {
    return await botConnection.updateTask(task_id, updateInformation);
};
module.exports = dialoges;

