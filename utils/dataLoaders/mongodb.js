const { SimpleMongoReader } = require("llamaindex");
 const { MongoClient } = require('mongodb');

const loadMongoData = async (db_details, task_id) => {
    const uri = `mongodb://${db_details.username}:${db_details.password}@${db_details.host}/${db_details.dbName}`
    const client = new MongoClient(uri);
    await client.connect();
    const mongoReader = await new SimpleMongoReader(client)
    const fields = Object.keys(db_details.data.fields);
    const documents = await mongoReader.loadData(
        db_details.dbName, db_details.data.collection, fields, ' ', db_details.data.filter, 0, ['_id']
    );
    documents.forEach((item)=> {
        item.metadata["task_id"] = task_id;
    })
    await client.close();
    return documents;

}

module.exports = {loadMongoData}