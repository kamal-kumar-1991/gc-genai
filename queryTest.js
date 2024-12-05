const {
  storageContextFromDefaults,
  VectorStoreIndex,
  Settings,
  OllamaEmbedding,
  Ollama,
  ChromaVectorStore
} = require("llamaindex");


const queryFunction = async () => {
  Settings.embedModel = new OllamaEmbedding({ model: "bge-m3" });
  Settings.llm = new Ollama({
    model: "llama3.2",
    temperature: 0.9,
    keepAlive: "10m",
    config: {
      host: "http://localhost:11434",
    },
  });

  const vectorStore = await new ChromaVectorStore({
    collectionName: "healthtrip_1",
    chromaClientParams: {
      path: "https://chromadb-dev.instock.co.in",
      auth: {
        provider: "token",
        credentials: "cff6ce8741cee9a608dd03b8b77f79c3",
        tokenHeaderType: 'AUTHORIZATION'
      }
    }
  });

  const loadedIndex = await VectorStoreIndex.fromVectorStore(vectorStore);

  const queryEngine = loadedIndex.asQueryEngine();
  let searchQuery = "what is Congenital Heart Disease Surgery";
  const res = await queryEngine.query({
    query: searchQuery,
  });
  console.log(res)
}

queryFunction();

