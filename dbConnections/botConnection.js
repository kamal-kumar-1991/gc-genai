const mongoose = require('mongoose');
const { Schema } = mongoose;
const db2 = mongoose.createConnection(process.env.BOT_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
const enterprise_data = new Schema({}, { strict: false, versionKey: false, collection: 'enterprise_data' });
const col_enterprise_data = db2.model('enterprise_data', enterprise_data);
const bot_collection_schema = new Schema({}, { strict: false, versionKey: false, collection: 'botConfig' });
const bot_config = db2.model('botConfig', bot_collection_schema);
const enterprise_data_sources = new Schema({}, { strict: false, versionKey: false, collection: 'enterprise_data_sources' });
const col_enterprise_data_sources = db2.model('enterprise_data_sources', enterprise_data_sources);

exports.fetchTaskInformation = async (task_id) => {
    try{    
       
        let query = { _id: new mongoose.Types.ObjectId(task_id)};
        
        const task_information =  await col_enterprise_data.findOne(query);
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
        await col_enterprise_data.updateOne({_id: new mongoose.Types.ObjectId(task_id)}, {$set:updateInformation});
    } catch (error) {
        
    }
}

exports.insertEnterpriseData = async (insertObj, callback) => {
    try {
        col_enterprise_data.insertOne(insertObj);
        callback(true);
    } catch(ex) {
        console.log(ex);
        callback(false);
    }
    
}

exports.fetchDataSource = async (filter) => {
    try{    
        const data_source_information =  await col_enterprise_data_sources.findOne({filter});
        if(data_source_information)
        {
            return data_source_information;
        } else {
            return false;
        }
    }catch(error){
        return false;
        // console.log(error)
    }   
}

exports.updateDataSource = async (source_id, updateInformation) => {
    try {
        await col_enterprise_data_sources.updateOne({_id: new mongoose.Types.ObjectId(source_id)}, {$set:updateInformation});
    } catch (error) {
        
    }
}

exports.fetchBotDetails = async (bot_id) => {
    try {
        let query = {id:bot_id};
        console.log(query)
        const botDetails = await bot_config.findOne(query);
        if(botDetails)
        {
            return botDetails
        }
        else{
            return false;
        }
    } catch (e) {
        console.log(e);
            return false
    }
}
