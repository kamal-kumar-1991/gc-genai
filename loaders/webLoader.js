require('dotenv').config();
const ChromaVectorStore = require("../utils/dataStores/chromaDb");
const {scrapeURL} = require("../test");
const {
  HTMLReader,
  Document,
  IngestionPipeline,
  //MetadataMode,
  OllamaEmbedding,
  TitleExtractor,
  SummaryExtractor,
  SentenceSplitter,
  Ollama,
  Settings,
  VectorStoreIndex,
  storageContextFromDefaults
} = require("llamaindex");
const axios = require("axios");
const dialoges = require("../controllers/dialogeController"); 

const webLoader = async (botDetails, task_id) => {
    Settings.embedModel = new OllamaEmbedding({ model: botDetails.preferences.embedding.model });
        Settings.llm = new Ollama({          
            model: botDetails.preferences.query.llm,
            temperature: 0.5,
            keepAlive: "10m"
            
        });
    const job = await dialoges.fetchTaskInformation(task_id);
    try {
        job.url.loader = "html";
        if(job.url && job.url.url && job.url.loader) {
            switch (job.url.loader) {
                case "html":
                    const reader = new HTMLReader();
                    const response = await scrapeURL(job.url.url);
                    
                    if(response) {
                        // Load the HTML into cheerio
                        const webContent = response;
                        let parsedContent = await reader.parseContent(webContent);
                        // console.log(parsedContent);
                        const document = new Document({ text: parsedContent });
                        // console.log(document);
                        document.metadata["task_id"] = task_id;
                        document.metadata["url"] = job.url.url;

                        // define pipeline
                        const pipeline = new IngestionPipeline({
                            transformations: [
                                new SentenceSplitter({ chunkSize: 256, chunkOverlap: 50 }),
                                // new TitleExtractor({llm: Settings.llm}),
                                // new SummaryExtractor({llm: Settings.llm}),
                                new OllamaEmbedding({ model: botDetails.preferences.embedding.model })
                            ]
                        });

                        // run the pipeline
                        const nodes = await pipeline.run({ documents: [document] });
                        switch (botDetails.vector_db.type) {
                            case "chromadb":
                                const vectorStore = await ChromaVectorStore.chromaVector(botDetails.vector_db);

                                const storageContext = await storageContextFromDefaults({
                                    vectorStore: vectorStore,
                                });

                                const loadedIndex =   await VectorStoreIndex.fromDocuments(nodes, {
                                    storageContext
                                });
                                if(loadedIndex)
                                {
                                    dialoges.updateTaskInformation(task_id, { "status":"done", "track.done": new Date() });
                                    return true;
                                    
                                }
                                
                                break;
                            default:
                                break;
                        }
                    }
                    break;
                default:
                    break;
            }
        }
    } catch(ex) {
        console.log('Error:: webPageLoader:', ex);
    }
}

module.exports = { webLoader }