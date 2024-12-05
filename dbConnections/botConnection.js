const { Schema, createConnection } = require('mongoose');
const { ObjectId } = require('mongodb');
const db2 = createConnection(process.env.BOT_DB_URI)
const chatbots = new Schema({}, { strict: false, versionKey: false, collection: 'col_chatbots' });
const col_chatbots = db2.model('col_chatbots', chatbots);
const enterprise_data_tasks = new Schema({}, { strict: false, versionKey: false, collection: 'col_enterprise_data_tasks' });
const col_enterprise_data_tasks = db2.model('col_enterprise_data_tasks', enterprise_data_tasks);
const enterprise_data_taskgroups = new Schema({}, { strict: false, versionKey: false, collection: 'col_enterprise_data_taskgroups' });
const col_enterprise_data_taskgroups = db2.model('col_enterprise_data_taskgroups', enterprise_data_taskgroups);


exports.fetchChatbotDetails = async (chatbot_id) => {
    try{
            const chatbot_details = await col_chatbots.findOne({"_id":new ObjectId(chatbot_id)});
            if(chatbot_details) {
                    return chatbot_details
            }
            else{ 
                    return false;
            }
    }catch(error){

    }
}

exports.fetchTaskInformation = async (task_id) => {
    try{    
       
        let query = { _id: new ObjectId(task_id)};
        
        const task_information =  await col_enterprise_data_tasks.findOne(query);
        if(task_information)
        {
            return task_information;
        }else{
            return false;
        }
    }catch(error){
        console.log(error)
        return false;
        
    }   
}

exports.updateTask = async (task_id, updateInformation) => {
    try {
        await col_enterprise_data_tasks.updateOne({_id: new ObjectId(task_id)}, {$set:updateInformation});
    } catch (error) {
        
    }
}

exports.insertEnterpriseData = async (insertObj) => {
    try {
        const insertIds = await col_enterprise_data_tasks.insertMany([insertObj]);
        if(insertIds && insertIds[0])
            return insertIds[0]._id;
        return false;

    } catch(ex) {
        console.log('Error:: insertEnterpriseData: ', ex);
        return false;
    }
    
}

exports.fetchEnterpriseSource = async (query) => {
    try{    
        const data_source_information =  await col_enterprise_data_taskgroups.findOne(query);
        if(data_source_information)
        {
            return data_source_information;
        } else {
            return false;
        }
    }catch(error){
        console.log(error)
        return false;
        
    }   
}

exports.updateEnterpriseSource = async (updateFilter, updateInformation) => {
    try {
        await col_enterprise_data_taskgroups.updateOne(updateFilter, {$set:updateInformation});
    } catch (error) {
        
    }
}

