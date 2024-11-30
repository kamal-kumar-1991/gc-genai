require('dotenv').config();
const chromaDb = require("../utils/dataStores/chromaDb");
const mongoLoader = require("../utils/dataLoaders/mongodb");
const dialoges = require("../controllers/dialogeController"); 

const {
    VectorStoreIndex,
    IngestionPipeline,
    OpenAIEmbedding,
    TitleExtractor,
    SummaryExtractor,
    SentenceSplitter,
    OpenAI,
    Settings
} = require('llamaindex');
// Configuration

// const llamaIndex = require("llamaindex");
let document = null;
const dbLoader = async (botDetails, db_details, task_id) => {
    try {
        Settings.llm = new OpenAI({
            model: botDetails.ai_setting.llm,
            temperature: 0.9,
            embedModel: botDetails.ai_setting.embed_model,
            apiKey: process.env.AZURE_OPENAI_KEY
        });

        switch (db_details.loader) {
            case "mongodb":
                document = await mongoLoader.loadMongoData(db_details, task_id);
                break;
            default:
                break;
        }
        switch (botDetails.ai_setting.vector_db.type) {
            case "chromadb":
                const pipeline = new IngestionPipeline({
                    transformations: [
                        new SentenceSplitter({ chunkSize: 200, chunkOverlap: 20 }),
                        new TitleExtractor({ llm: Settings.llm }),
                        new SummaryExtractor({ llm: Settings.llm }),
                        new OpenAIEmbedding()
                    ]
                });               
                // run the pipeline
                const nodes = await pipeline.run({ documents: document });
                const vectorStore = await chromaDb.chromaVector(botDetails.ai_setting.vector_db);            
                const index = await VectorStoreIndex.fromDocuments(document, { nodes,
                    vectorStore
                });               
                dialoges.updateTaskInformation(task_id, {status:"done"});
                break;
            default:
                break;
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}
module.exports = { dbLoader }
