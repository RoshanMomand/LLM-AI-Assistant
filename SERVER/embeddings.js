import {AzureChatOpenAI, AzureOpenAIEmbeddings} from "@langchain/openai";
import {TextLoader} from "langchain/document_loaders/fs/text";
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import {MemoryVectorStore} from "langchain/vectorstores/memory";
import { FaissStore } from "@langchain/community/vectorstores/faiss";


const model = new AzureChatOpenAI({temperature: 1});
let vectorStore;

const embeddings = new AzureOpenAIEmbeddings({
    temperature: 0,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME
});

async function loadGirlfriendStory() {
    // Welk bestand wil je gebruiken?
    const loader = new TextLoader('./ai-girlfriend.txt');
    const docs = await loader.load();


    // Split de documenten in kleinere tekst fragmenten zodat je niet grote hoeveelheden krijgt
    const textSplitter = new RecursiveCharacterTextSplitter({chunkSize: 500, chunkOverlap: 50});
    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`i created ${splitDocs.length} text chunks`);

    // sla je de data op in een vector store
    vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
    await vectorStore.save("ai-girlfriendvectordb"); // geef hier de naam van de directory waar je de data gaat opslaan

};


await loadGirlfriendStory()

