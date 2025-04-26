import {AzureChatOpenAI, AzureOpenAIEmbeddings} from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

let vectorStore;

const model = new AzureChatOpenAI({temperature: 1});

const embeddings = new AzureOpenAIEmbeddings({
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME
});
vectorStore = await FaissStore.load("proteinvectordb", embeddings); // dezelfde naam van de directory


async function askQuestion(question) {
    const relevantDocs = await vectorStore.similaritySearch(question, 3)
    const context = relevantDocs.map(doc => doc.pageContent).join("\n")
    const result = await model.invoke([
        ['system', "You are an chatbot who gives information about proteins and fats and keep the answers shorts"],
        ["human", `the context is ${context} and the question is ${question}`]
    ])
    return result.contents
}



 await askQuestion("what is the function of the protein")
