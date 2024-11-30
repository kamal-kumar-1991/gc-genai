const { 
    TextFileReader,PDFReader,
    MarkdownReader,DocxReader,CSVReader,JSONReader,
    VectorStoreIndex,
    IngestionPipeline,
    OpenAIEmbedding,
    TitleExtractor,
    SummaryExtractor,
    SentenceSplitter,
    OpenAI,
    Settings
} = require("llamaindex");
const dialoges = require("../controllers/dialogeController");

const chromaDb = require("../utils/dataStores/chromaDb");
const fileLoader = async (botDetails, fileDetails, task_id) => {
    try {
        Settings.llm = new OpenAI({
            model: botDetails.ai_setting.llm,
            temperature: 0.9,
            embedModel: botDetails.ai_setting.embed_model,
            apiKey: process.env.AZURE_OPENAI_KEY
        });

        let documents = null;
        const file_type = fileDetails.loader;
        switch (file_type) {
            case "json":
                const jsonReader = new JSONReader();
                 const json_path = "/opt/vcloudx/enterprise-data-loader/data/tinytweets.json";
                 documents = await jsonReader.loadData(json_path);
                break;
            case 'csv':              
                 const reader = new CSVReader();
                 const csv_path = "/opt/vcloudx/enterprise-data-loader/data/titanic_train.csv";
                 documents = await reader.loadData(csv_path);
                break;
                case 'pdf':  
                const pdfReader = new PDFReader();               
                const pdf_path = "/opt/vcloudx/enterprise-data-loader/data/manga.pdf"
                documents = await pdfReader.loadData(pdf_path);          
                break;
            case 'txt': 
                const textReader = new TextFileReader();
                const text_path = "/opt/vcloudx/enterprise-data-loader/data/titanic_train.csv";
                documents = await textReader.loadData(text_path);             
                break;
            case 'md':
                const mdReader = new MarkdownReader();
                const md_path = "/opt/vcloudx/enterprise-data-loader/data/readme.md";
                documents = await mdReader.loadData(md_path);            
                break;
            case 'docx': 
                const docxReader = new DocxReader();
                const doc_path = "/opt/vcloudx/enterprise-data-loader/data/star.docx";
                documents = await docxReader.loadData(doc_path);              
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
                const nodes = await pipeline.run({ documents: documents });
                console.log(nodes);
                const vectorStore = await chromaDb.chromaVector(botDetails.ai_setting.vector_db);            
                const index = await VectorStoreIndex.fromDocuments(documents, { nodes,
                    vectorStore
                });  
                console.log(index);             
                dialoges.updateTaskInformation(task_id, {status:"done"});
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