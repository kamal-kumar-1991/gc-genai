require('dotenv').config();
const chromaDb = require("../utils/dataStores/chromaDb");
const mongoLoader = require("../utils/dataLoaders/mongodb");
const dialoges = require("../controllers/dialogeController"); 
const { ObjectId } = require('mongodb');

const {
    VectorStoreIndex,
    IngestionPipeline,
    OllamaEmbedding,
    TitleExtractor,
    SummaryExtractor,
    SentenceSplitter,
    Ollama,
    Settings,
    storageContextFromDefaults
} = require('llamaindex');
// Configuration

let document = null;
const dbLoader = async (botDetails, db_details, task_id) => {
   try {      
        Settings.embedModel = new OllamaEmbedding({ model: botDetails.preferences.embeddings.model });
        Settings.llm = new Ollama({
            model: botDetails.preferences.query.llm,
            temperature: 0.9,
            keepAlive: "10m",
            config: {
                host: "http://ollama-dev.instock.co.in:11434",
            },
        });
       
        switch (db_details.loader) {
            case "mongodb":              
                document = await mongoLoader.loadMongoData(db_details, task_id);
                break;
            default:
                break;
        }
        switch (botDetails.vector_db.type) {
            case "chromadb":
                const pipeline = new IngestionPipeline({
                    transformations: [
                        new SentenceSplitter({ chunkSize: 256, chunkOverlap: 50 }),
                        // new TitleExtractor({ llm: Settings.llm }),
                        // new SummaryExtractor({ llm: Settings.llm }),
                        new OllamaEmbedding({ model: botDetails.preferences.embeddings.model })
                    ]
                });               
                // run the pipeline
              
                const nodes = await pipeline.run({ documents: document });
               
                const vectorStore = await chromaDb.chromaVector(botDetails.vector_db);  
                const storageContext = await storageContextFromDefaults({
                    vectorStore
                });          
                const index = await VectorStoreIndex.fromDocuments(nodes, {                    
                    storageContext
                });    
                if(index){
                    dialoges.updateTaskInformation(task_id, {status:"done"});
                }           
                
                break;
            default:
                break;
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}
module.exports = { dbLoader }
