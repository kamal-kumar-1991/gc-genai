const {
    TextFileReader, PDFReader,
    MarkdownReader, DocxReader, CSVReader, JSONReader,
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

const fileLoader = async () => {
    try {
        // const embedModel = new OllamaEmbedding({ model: "bge-m3" });
        Settings.embedModel = new OllamaEmbedding({ model: "bge-m3" });
        Settings.llm = new Ollama({
            model: "llama3.2",
            temperature: 0.9,
            keepAlive: "10m",
            config: {
                host: "http://127.0.0.1:11434",
            },
        });

        let documents = null;
        const file_type = 'pdf';
        switch (file_type) {
            case "json":
                const jsonReader = new JSONReader();
                const json_path = "./data/tinytweets.json";
                documents = await jsonReader.loadData(json_path);
                break;
            case 'csv':
                const reader = new CSVReader();
                const csv_path = "./data/titanic_train.csv";
                documents = await reader.loadData(csv_path);
                break;
            case 'pdf':
                const pdfReader = new PDFReader();
                const pdf_path = "./data/manga.pdf"
                documents = await pdfReader.loadData(pdf_path);
                break;
            case 'txt':
                const textReader = new TextFileReader();
                const text_path = "./data/titanic_train.csv";
                documents = await textReader.loadData(text_path);
                break;
            case 'md':
                const mdReader = new MarkdownReader();
                const md_path = "./data/readme.md";
                documents = await mdReader.loadData(md_path);
                break;
            case 'docx':
                const docxReader = new DocxReader();
                const doc_path = "./data/star.docx";
                documents = await docxReader.loadData(doc_path);
                break;

            default:
                break;
        }
        console.log(documents);
        const pipeline = new IngestionPipeline({
            transformations: [
                new SentenceSplitter({ chunkSize: 256, chunkOverlap: 50 }),
                // new TitleExtractor({ llm: Settings.llm }),
                // new SummaryExtractor({ llm: Settings.llm }),
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

}

fileLoader();