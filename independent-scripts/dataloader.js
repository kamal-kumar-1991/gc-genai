import dotenv from 'dotenv';
import {
  HTMLReader,
  Document,
  IngestionPipeline,
  //MetadataMode,
  OpenAIEmbedding,
  TitleExtractor,
  SummaryExtractor,
  SentenceSplitter,
  OpenAI,
  Settings,
  VectorStoreIndex,
  ChromaVectorStore,
  storageContextFromDefaults
} from "llamaindex";
import axios from "axios";

dotenv.config();

console.log('configure OpenAI settings')
Settings.llm = new OpenAI({
    model: "gpt-4",
    temperature: 0.9,
    embedModel: "text-embedding-ada-002",
    apiKey: process.env.AZURE_OPENAI_KEY
})

console.log('reading web URL')
const reader = new HTMLReader();
const response = await axios.get('https://github.com/git-guides');

// Load the HTML into cheerio
const webContent = response.data;
let parsedContent = await reader.parseContent(webContent);
const document = new Document({ text: parsedContent });

// define pipeline
console.log('defining pipeline')
const pipeline = new IngestionPipeline({
  transformations: [
    new SentenceSplitter({ chunkSize: 200, chunkOverlap: 20 }),
    new TitleExtractor({llm: Settings.llm}),
    new SummaryExtractor({llm: Settings.llm}),
    new OpenAIEmbedding()
  ]
});

// run the pipeline
console.log('running pipeline')
const nodes = await pipeline.run({ documents: [document] });

console.log('Initiating Chroma Vecort Store')
const vectorStore = await new ChromaVectorStore({
    collectionName: 'llm_storage_vikas',
    chromaClientParams: {
      path: "https://chromadb-qa.enablex.io/",
      auth: {
        provider: "token",
        credentials: 'bbb6df3bb04c377a047554db34c9c67f',
        tokenHeaderType: 'AUTHORIZATION'
      }
    }
})

const indexStore = await storageContextFromDefaults({
    persistDir: './llm_storage',
});

console.log('store in VectorStore')
const index = await VectorStoreIndex.fromDocuments(nodes, {
    indexStore,
    vectorStore
});

console.log('Initiating query engine');
// // Query the index
const queryEngine = index.asQueryEngine();
let searchQuery =  "What is GIT?";
console.log('sending query:', searchQuery);
const res = await queryEngine.query({
  query: searchQuery,
  azure: true
});
console.log('Query response:', res.toString());