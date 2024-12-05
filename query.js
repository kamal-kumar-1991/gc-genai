// const {
//   storageContextFromDefaults,
//   VectorStoreIndex,
//   Settings,
//   OllamaEmbedding,
//   Ollama,
//   ChromaVectorStore
// } = require("llamaindex");


// const queryFunction = async () => {
//   Settings.embedModel = new OllamaEmbedding({ model: "bge-m3" });
//   Settings.llm = new Ollama({
//     model: "llama3.2",
//     temperature: 0.9,
//     keepAlive: "10m",
//     config: {
//       host: "http://localhost:11434",
//     },
//   });

//   const vectorStore = await new ChromaVectorStore({
//     collectionName: "testCollection",
//     chromaClientParams: {
//       path: "https://chromadb-dev.instock.co.in",
//       auth: {
//         provider: "token",
//         credentials: "cff6ce8741cee9a608dd03b8b77f79c3",
//         tokenHeaderType: 'AUTHORIZATION'
//       }
//     }
//   });

//   const loadedIndex = await VectorStoreIndex.fromVectorStore(vectorStore);

//   const queryEngine = loadedIndex.asQueryEngine();
//   let searchQuery = "what are the user restrictions?";
//   const res = await queryEngine.query({
//     query: searchQuery,
//   });
//   console.log(res)
// }

// queryFunction();

const publish = require("./publish");

const json_file = require("./file.json");

const axios = require('axios');

json_file.urlset.url.forEach((item)=>{
    let url = item.loc;
    let data = JSON.stringify({
      "type": "url",
      "url": {
        "url": url
      }
    });
    
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api-infra.instock.co.in/v1/data-ingestion/GCB-FVXVUWSQ/tasks',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': 'Basic NjcxMTQ5MGY2ODc0MTg0OTk1MGY5MDhjOnU5dVp5aGFyYW1lSHlKYXFhZWVOeVR5RXkyZXBhMnVaYUJ5OA=='
      },
      data : data
    };
    
    axios.request(config)
    .then((response) => {
        let task_id = response.data.task_id;
        publish.publishMessage({"operation":"loader","type":"website","task_id":task_id});
    })
    .catch((error) => {
      console.log(error);
    });

})


// publish.publishMessage({"operation":"loader","type":"website","task_id":"67514f49b2131494750c8e1e"});





// 