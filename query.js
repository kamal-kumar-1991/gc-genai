const {  storageContextFromDefaults,
    VectorStoreIndex,Settings,OllamaEmbedding,Ollama }  = require("llamaindex");


const queryFunction = async ()  => {
    Settings.embedModel = new OllamaEmbedding({ model: "bge-m3" });
    Settings.llm = new Ollama({
        model: "llama3.2",
        temperature: 0.9,
        keepAlive: "10m",
        config: {
          host: "http://localhost:11434",
        },
      });

      // Split text and create embeddings. Store them in a VectorStoreIndex
      const secondStorageContext = await storageContextFromDefaults({
        persistDir: "./llm_storage",
    });
    const loadedIndex = await VectorStoreIndex.init({
        storageContext: secondStorageContext,
    });

      const queryEngine = loadedIndex.asQueryEngine();
        let searchQuery =  "what are the user restrictions?";
        console.log('sending query:', searchQuery);
        const res = await queryEngine.query({
            query: searchQuery
        });
        console.log(res)
} 

queryFunction();