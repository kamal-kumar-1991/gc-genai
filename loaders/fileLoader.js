const { 
    TextFileReader,PDFReader,
    HTMLReader,
    MarkdownReader,DocxReader,CSVReader,JSONReader,
    VectorStoreIndex,
    IngestionPipeline,
    OllamaEmbedding,
    TitleExtractor,
    SummaryExtractor,
    SentenceSplitter,
    Ollama,
    Settings,
    storageContextFromDefaults
} = require("llamaindex");
const dialoges = require("../controllers/dialogeController");

const chromaDb = require("../utils/dataStores/chromaDb");
const fileLoader = async (botDetails, fileDetails, task_id) => {
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
        let documents = null;
        const file_type = fileDetails.loader;
        const file_path = fileDetails.path;
        switch (file_type) {
            case "json":
                const jsonReader = new JSONReader();
                //  const json_path = "/opt/vcloudx/enterprise-data-loader/data/tinytweets.json";
                 documents = await jsonReader.loadData(file_path);
                break;
            case 'csv':              
                 const reader = new CSVReader();
                //  const csv_path = "/opt/vcloudx/enterprise-data-loader/data/titanic_train.csv";
                 documents = await reader.loadData(file_path);
                break;
            case 'pdf':  
                const pdfReader = new PDFReader();               
                // const pdf_path = "/opt/vcloudx/enterprise-data-loader/data/LDExplained.pdf"
                documents = await pdfReader.loadData(file_path);          
                break;
            case 'text': 
                const textReader = new TextFileReader();
                // const text_path = "/opt/vcloudx/enterprise-data-loader/data/titanic_train.csv";
                documents = await textReader.loadData(file_path);             
                break;
            case 'markdown':
                const mdReader = new MarkdownReader();
                // const md_path = "/opt/vcloudx/enterprise-data-loader/data/readme.md";
                documents = await mdReader.loadData(file_path);            
                break;
            case 'docs': 
                const docxReader = new DocxReader();
                // const doc_path = "/opt/vcloudx/enterprise-data-loader/data/star.docx";
                documents = await docxReader.loadData(file_path);              
                break;
            case 'html':
                const htmlReader = new HTMLReader();
                // const html_path = "/opt/vcloudx/enterprise-data-loader/data/star.docx";
                documents = await htmlReader.loadData(file_path);              
                break;
             
            default:
                break;
        }
        documents.forEach((item) => {
            item.metadata["task_id"] = task_id;
        })

        switch (botDetails.aiAgent_Setting.vector_db.type) {
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
                const nodes = await pipeline.run({ documents: documents });
                console.log(nodes);
                const vectorStore = await chromaDb.chromaVector(botDetails.aiAgent_Setting.vector_db);            
                const storageContext = await storageContextFromDefaults({
                    vectorStore
                });          
                const index = await VectorStoreIndex.fromDocuments(nodes, {                    
                    storageContext
                }); 
                if(index)
                {
                    dialoges.updateTaskInformation(task_id, {status:"done"});
                }            
                
                break;
            default:
                break;
        }

    }
    catch(error){
        console.log(error)
    }   

}

module.exports = {fileLoader}
