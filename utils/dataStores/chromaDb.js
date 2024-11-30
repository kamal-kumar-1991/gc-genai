const { ChromaVectorStore}  = require("llamaindex");

const chromaVector = async (vectorDbDetails) => {
    const vectorStore = await new ChromaVectorStore({
        collectionName: vectorDbDetails.collection,
        chromaClientParams: {
          path: vectorDbDetails.host,
          auth: {
            provider: "token",
            credentials:vectorDbDetails.password,
            tokenHeaderType: 'AUTHORIZATION'
          }
        }
    });
    return vectorStore;
}

module.exports = { chromaVector }