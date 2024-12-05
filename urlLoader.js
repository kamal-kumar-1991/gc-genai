const {
    TextFileReader, PDFReader,
    MarkdownReader, DocxReader, CSVReader, JSONReader,
    HTMLReader,
    IngestionPipeline,
    storageContextFromDefaults,
    VectorStoreIndex,
    ChromaVectorStore,
    TitleExtractor,
    SummaryExtractor,
    SentenceSplitter,
    OllamaEmbedding,
    Ollama,
    Settings
} = require("llamaindex");

const urlLoader = async (url) => {
    console.log(url);

    /*
    try {
        
        // const embedModel = new OllamaEmbedding({ model: "bge-m3" });
        Settings.embedModel = new OllamaEmbedding({ model: "bge-m3" });
        Settings.llm = new Ollama({
            model: "llama3.2",
            temperature: 0.5,
            keepAlive: "10m",
            config: {
                host: "http://127.0.0.1:11434",
            },
        });

        let documents = null;
        const file_type = 'html';
        switch (file_type) {
            case "html":
                const reader = new HTMLReader();
                const response = await axios.get(url);
                if(response && response.data) {
                    // Load the HTML into cheerio
                    const webContent = response.data;
                    let parsedContent = await reader.parseContent(webContent);
                    document = new Document({ text: parsedContent });
                   
                    
                    document.metadata["url"] = url;
                }
                break;      
          

            default:
                break;
        }

        const pipeline = new IngestionPipeline({
            transformations: [
                new SentenceSplitter({ chunkSize: 256, chunkOverlap: 50 }),
                new OllamaEmbedding({ model: "bge-m3" })
            ]
        });

        //  run the pipeline
        const nodes = await pipeline.run({ documents: documents });
        console.log(nodes);

        const vectorStore = await new ChromaVectorStore({
            collectionName: "testCollection",
            chromaClientParams: {
                path: "https://chromadb-dev.instock.co.in",
                auth: {
                    provider: "token",
                    credentials: "cff6ce8741cee9a608dd03b8b77f79c3",
                    tokenHeaderType: 'AUTHORIZATION'
                }
            }
        });


        const storageContext = await storageContextFromDefaults({
            vectorStore: vectorStore,
        });

        // Split text and create embeddings. Store them in a VectorStoreIndex
        const index = await VectorStoreIndex.fromDocuments(nodes, {
            storageContext,
        });


    }
    catch (error) {
        console.log(error)
    }
*/
}

module.exports = {urlLoader}